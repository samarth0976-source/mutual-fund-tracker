// Build: 2025-12-14T00:55:00Z - IPO Feature v1.2.1 DEBUG
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import puppeteer from 'puppeteer';
import axios from 'axios';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import mongoose from 'mongoose';
import cron from 'node-cron';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TradingView = require('@mathieuc/tradingview');
import { Redis } from '@upstash/redis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// IMPORTANT: Middleware must come BEFORE routes
app.use(cors());
app.use(express.json());

// Health check for Render
app.get('/health', (req, res) => res.status(200).send('OK'));

// EARLY API ROUTES - Must be before static files
// Simple test endpoint to verify API routing works
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// IPO ENDPOINT - Defined early to ensure it works before express.static
app.get('/api/ipo', async (req, res) => {
    console.log('📈 IPO endpoint hit');
    try {
        // Try to fetch live IPO data from investorgain.com
        const response = await axios.get('https://www.investorgain.com/report/live-ipo-gmp/331/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 15000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        const upcoming = [];
        const ongoing = [];
        const closed = [];

        // Parse the main IPO GMP table
        $('table.table tbody tr').each((index, element) => {
            const $row = $(element);
            const cells = $row.find('td');

            if (cells.length >= 5) {
                const name = $(cells[0]).text().trim();
                const priceText = $(cells[1]).text().trim();
                const gmpText = $(cells[2]).text().trim();
                const estListingText = $(cells[3]).text().trim();
                const lastUpdated = $(cells[4]).text().trim();

                // Skip header rows or empty rows
                if (!name || name.toLowerCase().includes('ipo name')) return;

                // Parse issue price (handle ranges like "₹120-130")
                const priceMatch = priceText.match(/[\d,]+/g);
                const issuePrice = priceMatch ? parseInt(priceMatch[priceMatch.length - 1].replace(/,/g, '')) : null;

                // Parse GMP (handle +/- and "₹" symbol)
                const gmpMatch = gmpText.match(/[+-]?\d+/);
                const gmp = gmpMatch ? parseInt(gmpMatch[0]) : 0;

                // Parse estimated listing price
                const estListingMatch = estListingText.match(/[\d,]+/);
                const estListingPrice = estListingMatch ? parseInt(estListingMatch[0].replace(/,/g, '')) : null;

                // Determine IPO type (SME or Mainboard)
                const type = name.toLowerCase().includes('sme') ? 'SME' : 'Mainboard';

                // Determine fire rating based on GMP percentage
                let fireRating = 1;
                if (issuePrice && gmp) {
                    const gmpPercent = (gmp / issuePrice) * 100;
                    if (gmpPercent > 50) fireRating = 5;
                    else if (gmpPercent > 30) fireRating = 4;
                    else if (gmpPercent > 15) fireRating = 3;
                    else if (gmpPercent > 5) fireRating = 2;
                    else fireRating = 1;
                }

                const ipoData = {
                    name: name.replace(/\s+(SME|IPO)/gi, '').trim(),
                    issuePrice,
                    gmp,
                    estListingPrice,
                    type,
                    fireRating,
                    lastUpdated
                };

                // Check if IPO is closed/listed (no GMP or marked as listed)
                if (gmpText.toLowerCase().includes('listed') || lastUpdated.toLowerCase().includes('listed')) {
                    closed.push({ ...ipoData, listingPrice: estListingPrice, listingGain: gmp });
                } else if (gmp !== 0) {
                    ongoing.push(ipoData);
                } else {
                    upcoming.push(ipoData);
                }
            }
        });

        // If scraping fails or returns empty, return fallback data
        if (ongoing.length === 0 && upcoming.length === 0) {
            console.log('📈 No IPO data scraped, returning fallback');
            return res.json({
                upcoming: [],
                ongoing: [
                    { name: 'Gujarat Kidney', issuePrice: 425, gmp: 120, type: 'Mainboard', fireRating: 4, estListingPrice: 545 },
                    { name: 'Wakefit Innovations', issuePrice: 450, gmp: 85, type: 'Mainboard', fireRating: 3, estListingPrice: 535 }
                ],
                closed: [],
                lastUpdated: new Date().toISOString(),
                source: 'fallback-data'
            });
        }

        console.log(`📈 IPO data scraped: ${ongoing.length} ongoing, ${upcoming.length} upcoming, ${closed.length} closed`);
        res.json({
            upcoming,
            ongoing,
            closed,
            lastUpdated: new Date().toISOString(),
            source: 'investorgain.com'
        });
    } catch (error) {
        console.error('IPO endpoint error:', error.message);
        // Return fallback data on error
        res.json({
            upcoming: [],
            ongoing: [
                { name: 'Gujarat Kidney', issuePrice: 425, gmp: 120, type: 'Mainboard', fireRating: 4, estListingPrice: 545 },
                { name: 'Wakefit Innovations', issuePrice: 450, gmp: 85, type: 'Mainboard', fireRating: 3, estListingPrice: 535 }
            ],
            closed: [],
            lastUpdated: new Date().toISOString(),
            source: 'fallback-error'
        });
    }
});

// NOTE: Static files are served AFTER all API routes - see end of file

// Cache clear endpoint for debugging
app.post('/api/cache/clear', async (req, res) => {
    holdingsCache.flushAll();
    stockDetailsCache.flushAll();
    searchCache.flushAll();

    // Clear Redis cache if available
    if (redis) {
        try {
            await redis.flushall();
            console.log('🗑️ Redis cache cleared');
        } catch (error) {
            console.warn('Failed to clear Redis:', error.message);
        }
    }

    console.log('🗑️ All caches cleared');
    res.json({ success: true, message: 'All caches cleared (Memory + Redis)' });
});

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const USERS_FILE = path.join(__dirname, 'users.json');

// Cashfree Configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET;
const CASHFREE_BASE_URL = 'https://api.cashfree.com/pg/orders';

// Groww API URLs
const GROWW_SEARCH_URL = 'https://groww.in/v1/api/search/v3/query/global/st_query?page=0&query=';
const GROWW_HOLDINGS_URL = 'https://groww.in/v1/api/data/mf/web/v1/scheme/search_id/';

// Caches with different TTLs for different data types
// Last updated: 2025-12-04T18:06:00+05:30
const searchCache = new NodeCache({ stdTTL: 86400 }); // 24 hours for search results
const holdingsCache = new NodeCache({ stdTTL: 86400 }); // 24 hours for holdings
const fundDetailsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour for fund details
const stockDetailsCache = new NodeCache({ stdTTL: 28800 }); // 8 hours for stock details

// Upstash Redis Setup (persistent cache)
let redis = null;
const REDIS_TTL = 86400; // 24 hours in seconds

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        console.log('✅ Connected to Upstash Redis');
    } catch (error) {
        console.warn('⚠️  Redis connection failed, using in-memory cache:', error.message);
    }
} else {
    console.log('ℹ️  No Redis credentials found, using in-memory cache only');
}

// Redis helper functions with NodeCache fallback
const redisGet = async (key) => {
    try {
        if (redis) {
            const data = await redis.get(key);
            if (data) {
                console.log(`📦 Redis HIT: ${key}`);
                return data;
            }
        }
    } catch (error) {
        console.warn('Redis get error:', error.message);
    }
    return null;
};

const redisSet = async (key, value, ttl = REDIS_TTL) => {
    try {
        if (redis) {
            await redis.set(key, value, { ex: ttl });
            console.log(`💾 Redis SET: ${key} (TTL: ${ttl}s)`);
            return true;
        }
    } catch (error) {
        console.warn('Redis set error:', error.message);
    }
    return false;
};

// MongoDB Connection (optional - falls back to file-based if not configured)
const MONGODB_URI = process.env.MONGODB_URI;
let User = null;
let Watchlist = null;

if (MONGODB_URI) {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Dynamically import models only if MongoDB is connected
        const { default: UserModel } = await import('./models/User.js');
        User = UserModel;

        const { default: WatchlistModel } = await import('./models/Watchlist.js');
        Watchlist = WatchlistModel;
        console.log('✅ Watchlist model loaded');
    } catch (error) {
        console.warn('⚠️  MongoDB connection failed, using file-based storage:', error.message);
    }
} else {
    console.log('ℹ️  No MONGODB_URI found, using file-based storage');
}

// News Scraper Setup
let newsCache = [];
let lastNewsUpdate = null;


async function updateNews() {
    try {
        // Try scraping Moneycontrol using Cheerio
        const response = await axios.get('https://www.moneycontrol.com/news/business/markets/', {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const newsItems = [];

        // Select news items (adjust selector based on Moneycontrol's structure)
        $('li.clearfix').slice(0, 10).each((i, elem) => {
            const titleElement = $(elem).find('h2 a');
            const title = titleElement.text().trim();
            const url = titleElement.attr('href');
            const time = $(elem).find('span').text().trim();

            if (title && url) {
                newsItems.push({
                    id: `news_${Date.now()}_${i}`,
                    title,
                    source: 'Moneycontrol',
                    timestamp: new Date().toISOString(), // Use current time as fallback
                    timeAgo: time,
                    url: url
                });
            }
        });

        if (newsItems.length > 0) {
            newsCache = newsItems;
            lastNewsUpdate = new Date();
            console.log(`[News] Scraped ${newsItems.length} items at ${lastNewsUpdate.toLocaleTimeString()}`);
        } else {
            throw new Error('No news items found');
        }
    } catch (error) {
        console.error('[News] Scraping failed, using fallback:', error.message);
        // Fallback to generic market news if scraping fails
        if (newsCache.length === 0) {
            newsCache = [
                {
                    id: `news_fallback_1`,
                    title: "Market Update: Sensex and Nifty trading flat amid global cues",
                    source: 'Market News',
                    timestamp: new Date().toISOString(),
                    url: 'https://www.moneycontrol.com/news/business/markets/'
                },
                {
                    id: `news_fallback_2`,
                    title: "Top mutual funds to invest in for 2025: Expert analysis",
                    source: 'Fund Insights',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    url: 'https://www.moneycontrol.com/mutual-funds/'
                }
            ];
        }
    }
}

// Update news every 30 minutes
cron.schedule('*/30 * * * *', updateNews);
updateNews(); // Initial fetch

// Gemini AI Setup (optional)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;

// Puppeteer function to scrape Groww pages
const fetchPageWithPuppeteer = async (url) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const nextData = await page.evaluate(() => {
            const scriptTag = document.querySelector('#__NEXT_DATA__');
            return scriptTag ? JSON.parse(scriptTag.textContent) : null;
        });

        await browser.close();
        return nextData;
    } catch (error) {
        console.error('Puppeteer error:', error.message);
        if (browser) await browser.close();
        return null;
    }
};

if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized');
} else {
    console.log('ℹ️  No GEMINI_API_KEY found, AI features disabled');
}

// Middleware already set up at the top of the file

// In the AI endpoint (around line 840):
// const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

// Helper to fetch returns using TradingView API
const fetchReturnsFromTV = async (stockName) => {
    return new Promise(async (resolve) => {
        console.log(`[TV] Searching for: ${stockName}`);

        try {
            let searchResults = await TradingView.searchMarketV3(stockName);

            // Helper to check for Indian exchanges
            const findIndianStock = (results) => {
                if (!results) return null;
                return results.find(s => s.exchange === 'NSE') || results.find(s => s.exchange === 'BSE');
            };

            let match = findIndianStock(searchResults);

            // Retry with shorter names if no Indian stock found
            if (!match) {
                const words = stockName.split(' ');

                // Try first 2 words
                if (words.length > 2) {
                    const shortName = words.slice(0, 2).join(' ');
                    const results2 = await TradingView.searchMarketV3(shortName);
                    match = findIndianStock(results2);
                }

                // Try first 1 word
                if (!match && words.length > 1) {
                    const shortName = words[0];
                    const results3 = await TradingView.searchMarketV3(shortName);
                    match = findIndianStock(results3);
                }
            }

            if (!match) {
                // Fallback to first result if it exists
                match = searchResults && searchResults.length > 0 ? searchResults[0] : null;
                if (!match) return resolve(null);
            }

            const symbol = `${match.exchange}:${match.symbol}`;
            console.log(`[TV] Found symbol: ${symbol}`);

            const client = new TradingView.Client();
            const chart = new client.Session.Chart();

            chart.setMarket(symbol, {
                timeframe: 'D',
                range: 1200, // Request enough bars for 3 years
            });

            // Set a timeout to avoid hanging
            const timeout = setTimeout(() => {
                client.end();
                resolve(null);
            }, 3000);

            chart.onUpdate(() => {
                if (!chart.periods || chart.periods.length === 0) return;

                const periods = chart.periods;
                const currentPrice = periods[0].close;

                // Helper to find price at a specific date
                const findPriceAtDate = (targetDate) => {
                    const targetTime = targetDate.getTime() / 1000;
                    let closest = null;
                    let minDiff = Infinity;

                    for (const p of periods) {
                        const diff = Math.abs(p.time - targetTime);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closest = p;
                        }
                    }

                    // If closest is too far (e.g. > 10 days), return null
                    if (minDiff > 10 * 24 * 3600) return null;
                    return closest ? closest.close : null;
                };

                const now = new Date();
                const d1m = new Date(now); d1m.setMonth(d1m.getMonth() - 1);
                const d1y = new Date(now); d1y.setFullYear(d1y.getFullYear() - 1);
                const d3y = new Date(now); d3y.setFullYear(d3y.getFullYear() - 3);

                const p1m = findPriceAtDate(d1m);
                const p1y = findPriceAtDate(d1y);
                const p3y = findPriceAtDate(d3y);

                const calculateReturn = (current, old) => {
                    if (!old) return null;
                    return ((current - old) / old) * 100;
                };

                const returns = {
                    return1m: calculateReturn(currentPrice, p1m)?.toFixed(2) || null,
                    return1y: calculateReturn(currentPrice, p1y)?.toFixed(2) || null,
                    return3y: calculateReturn(currentPrice, p3y)?.toFixed(2) || null
                };

                clearTimeout(timeout);
                client.end();
                resolve(returns);
            });

            chart.onError((...err) => {
                clearTimeout(timeout);
                client.end();
                resolve(null);
            });

        } catch (error) {
            console.error(`[TV] Error processing ${stockName}:`, error.message);
            resolve(null);
        }
    });
};

// Helper to fetch stock details and history from TradingView
const fetchStockDetailsFromTV = async (stockName) => {
    return new Promise(async (resolve) => {
        console.log(`[TV] Fetching details for: ${stockName}`);

        try {
            let searchResults = await TradingView.searchMarketV3(stockName);

            // Helper to check for Indian exchanges
            const findIndianStock = (results) => {
                if (!results) return null;
                return results.find(s => s.exchange === 'NSE') || results.find(s => s.exchange === 'BSE');
            };

            let match = findIndianStock(searchResults);

            // Retry with shorter names if no Indian stock found
            if (!match) {
                const words = stockName.split(' ');

                // Try first 2 words
                if (words.length > 2) {
                    const shortName = words.slice(0, 2).join(' ');
                    const results2 = await TradingView.searchMarketV3(shortName);
                    match = findIndianStock(results2);
                }

                // Try first 1 word
                if (!match && words.length > 1) {
                    const shortName = words[0];
                    const results3 = await TradingView.searchMarketV3(shortName);
                    match = findIndianStock(results3);
                }
            }

            if (!match) {
                match = searchResults && searchResults.length > 0 ? searchResults[0] : null;
                if (!match) return resolve(null);
            }

            const symbol = `${match.exchange}:${match.symbol}`;
            console.log(`[TV] Found symbol: ${symbol}`);

            const client = new TradingView.Client();
            const chart = new client.Session.Chart();

            chart.setMarket(symbol, {
                timeframe: 'D',
                range: 365, // Request 1 year of data
            });

            const timeout = setTimeout(() => {
                console.log(`[TV] Timeout for ${symbol}`);
                client.end();
                resolve(null);
            }, 5000);

            chart.onUpdate(() => {
                if (!chart.periods || chart.periods.length === 0) return;

                const periods = chart.periods;
                const currentPrice = periods[0].close;
                const meta = chart.infos;

                const history = periods.map(p => ({
                    time: p.time, // Unix timestamp in seconds
                    open: p.open,
                    high: p.high,
                    low: p.low,
                    close: p.close
                })).reverse(); // Sort oldest to newest for charting

                const details = {
                    symbol: match.symbol,
                    exchange: match.exchange,
                    description: meta.description,
                    currency: meta.currency_id,
                    currentPrice: currentPrice,
                    history: history
                };

                console.log(`[TV] Fetched details for ${symbol}`);

                clearTimeout(timeout);
                client.end();
                resolve(details);
            });

            chart.onError((...err) => {
                console.error(`[TV] Chart error for ${symbol}:`, ...err);
                clearTimeout(timeout);
                client.end();
                resolve(null);
            });

        } catch (error) {
            console.error(`[TV] Error fetching details for ${stockName}:`, error.message);
            resolve(null);
        }
    });
};

const BATCH_SIZE = 25; // Further increased batch size
const DELAY_MS = 100; // Minimal delay

const cleanCompanyName = (name) => {
    if (!name) return "";
    let cleaned = name.trim();

    // Remove common suffixes that confuse search
    cleaned = cleaned.replace(/\s+Ltd\.?$/i, '')
        .replace(/\s+Limited$/i, '')
        .replace(/\s+India$/i, '')
        .replace(/\s+Inds\.?$/i, '')
        .replace(/\s+Industries$/i, '')
        .replace(/\s+Holdings$/i, '')
        .replace(/\s+Enterprises$/i, '')
        .replace(/\s+Corporation$/i, '')
        .replace(/\s+Corp\.?$/i, '');

    // Fix specific known issues
    if (cleaned.includes("Mahindra & Mahindra")) return "M&M";

    return cleaned.trim();
};

const processBatch = async (batch) => {
    return Promise.all(batch.map(async (item) => {
        let realReturns = null;
        try {
            if (!item.company_name) {
                throw new Error("Missing company_name");
            }

            const cleanedName = cleanCompanyName(item.company_name);
            console.log(`Processing: ${item.company_name} -> ${cleanedName}`);

            // Use TradingView
            realReturns = await fetchReturnsFromTV(cleanedName);

            // Retry with raw name if cleaned failed and they are different
            if (!realReturns && cleanedName !== item.company_name) {
                // console.log(`Retrying with raw name: ${item.company_name}`);
                realReturns = await fetchReturnsFromTV(item.company_name);
            }

        } catch (e) {
            // console.error(`Error processing ${item.company_name}:`, e.message);
        }

        return {
            name: item.company_name || "Unknown",
            sector: item.sector_name || "Equity",
            allocation: item.corpus_per ? item.corpus_per.toFixed(2) : "0.00",
            return1y: realReturns?.return1y || null,
            return3y: realReturns?.return3y || null,
            return1m: realReturns?.return1m || null,
            isReal: !!realReturns
        };
    }));
};

app.get('/api/holdings', async (req, res) => {
    const { name, schemeCode, refresh } = req.query;
    if (!name) {
        return res.status(400).json({ error: "Fund name is required" });
    }

    try {
        // Use schemeCode as primary cache key to prevent collisions
        if (!schemeCode) {
            console.log(`⚠️ No schemeCode provided for: ${name}`);
        }
        const holdingsCacheKey = `holdings_v2_${schemeCode || 'name_' + name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50).toLowerCase()}`;

        console.log(`🔍 Holdings request: name="${name.substring(0, 40)}", schemeCode=${schemeCode}, refresh=${refresh}, cacheKey=${holdingsCacheKey}`);

        // Skip cache if refresh=true
        if (refresh !== 'true') {
            // Check Redis first (persistent cache)
            const redisData = await redisGet(holdingsCacheKey);
            if (redisData) {
                console.log(`📦 Redis HIT for ${schemeCode}: ${name.substring(0, 30)}`);
                return res.json({
                    ...redisData,
                    meta: {
                        ...redisData.meta,
                        cached: true,
                        cacheSource: 'redis',
                        cacheKey: holdingsCacheKey
                    }
                });
            }

            // Check NodeCache as fallback
            const cachedHoldings = holdingsCache.get(holdingsCacheKey);
            if (cachedHoldings) {
                console.log(`📦 Memory HIT for ${schemeCode}: ${name.substring(0, 30)}`);
                await redisSet(holdingsCacheKey, cachedHoldings);
                return res.json({
                    ...cachedHoldings,
                    meta: {
                        ...cachedHoldings.meta,
                        cached: true,
                        cacheSource: 'memory',
                        cacheKey: holdingsCacheKey
                    }
                });
            }
        } else {
            console.log(`🔄 Refresh requested - bypassing cache for ${schemeCode}`);
        }

        // Try Python Holdings Service first (yahooquery)
        const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL;

        if (PYTHON_SERVICE_URL) {
            console.log(`🐍 Fetching from Python service: ${name}`);
            try {
                const pythonResponse = await axios.get(
                    `${PYTHON_SERVICE_URL}/fund-holdings`,
                    {
                        params: { name },
                        timeout: 10000
                    }
                );

                if (pythonResponse.data && pythonResponse.data.holdings) {
                    const holdings = pythonResponse.data.holdings.map(item => ({
                        name: item.name || "Unknown",
                        sector: item.sector || "Equity",
                        allocation: item.allocation?.toString() || "0.00",
                        return1y: null,
                        return3y: null,
                        return1m: null,
                        isReal: true
                    }));

                    const response = {
                        holdings,
                        sectors: pythonResponse.data.sectors || [],
                        meta: {
                            fund: pythonResponse.data.fundName || name,
                            totalHoldings: holdings.length,
                            dataSource: 'Yahoo Finance (Python)',
                            yahooSymbol: pythonResponse.data.symbol,
                            timestamp: new Date().toISOString()
                        }
                    };

                    // Cache in Redis and Memory
                    await redisSet(holdingsCacheKey, response);
                    holdingsCache.set(holdingsCacheKey, response);
                    console.log(`✅ Cached from Python: ${name} (${holdings.length} holdings)`);

                    return res.json(response);
                }
            } catch (pythonError) {
                console.warn(`🐍 Python service failed: ${pythonError.message}`);
            }
        }

        // Fallback to Groww scraping
        console.log(`🔄 Falling back to Groww for: ${name}`);
        return await fetchFromGroww(req, res, name, schemeCode, holdingsCacheKey);

    } catch (error) {
        console.error('Error fetching holdings:', error.message);
        res.status(500).json({
            error: 'Failed to fetch data',
            details: error.message
        });
    }
});

// Function to fetch from Groww using their API (replaces Puppeteer scraping)
async function fetchFromGroww(req, res, name, schemeCode, holdingsCacheKey) {
    try {
        console.log(`🔄 Fetching from Groww API: ${name} (schemeCode: ${schemeCode})`);

        // Extract significant keywords from fund name for matching
        const originalNameLower = name.toLowerCase();

        // Extract fund type keywords for stricter matching
        const fundTypeKeywords = [];
        if (originalNameLower.includes('small') && originalNameLower.includes('cap')) fundTypeKeywords.push('small');
        if (originalNameLower.includes('mid') && originalNameLower.includes('cap')) fundTypeKeywords.push('mid');
        if (originalNameLower.includes('large') && originalNameLower.includes('cap')) fundTypeKeywords.push('large');
        if (originalNameLower.includes('flexi')) fundTypeKeywords.push('flexi');
        if (originalNameLower.includes('bluechip')) fundTypeKeywords.push('bluechip');
        if (originalNameLower.includes('blue chip')) fundTypeKeywords.push('blue');
        if (originalNameLower.includes('index')) fundTypeKeywords.push('index');
        if (originalNameLower.includes('elss') || originalNameLower.includes('tax')) fundTypeKeywords.push('elss', 'tax');
        if (originalNameLower.includes('focused')) fundTypeKeywords.push('focused');
        if (originalNameLower.includes('value')) fundTypeKeywords.push('value');
        if (originalNameLower.includes('contra')) fundTypeKeywords.push('contra');
        if (originalNameLower.includes('multi')) fundTypeKeywords.push('multi');
        if (originalNameLower.includes('nifty')) fundTypeKeywords.push('nifty');
        if (originalNameLower.includes('balanced')) fundTypeKeywords.push('balanced');
        if (originalNameLower.includes('equity')) fundTypeKeywords.push('equity');

        // Clean the fund name for better search results
        const cleanName = name
            .replace(/-?\s*Direct\s*(Plan)?\s*-?/gi, '')
            .replace(/-?\s*Growth\s*(Option)?\s*-?/gi, '')
            .replace(/-?\s*Regular\s*(Plan)?\s*-?/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Extract AMC name for matching (must match)
        const amcPatterns = ['hdfc', 'icici prudential', 'icici', 'sbi', 'axis', 'kotak', 'nippon india', 'nippon',
            'tata', 'dsp', 'mirae asset', 'mirae', 'aditya birla', 'uti', 'franklin', 'pgim',
            'canara robeco', 'canara', 'edelweiss', 'invesco', 'motilal oswal', 'motilal',
            'sundaram', 'hsbc', 'bandhan', 'baroda bnp', 'union', 'jm', 'quant', 'ppfas', 'parag parikh', 'lic'];

        let amcName = '';
        for (const amc of amcPatterns) {
            if (originalNameLower.includes(amc)) {
                amcName = amc;
                break;
            }
        }

        console.log(`📌 AMC: ${amcName || 'unknown'}, Fund Type: ${fundTypeKeywords.join(', ') || 'generic'}`);

        // Build search query
        const searchQuery = encodeURIComponent(cleanName + ' Direct Growth');
        const searchUrl = `https://groww.in/v1/api/search/v1/entity?q=${searchQuery}&page=0&size=15&entity_type=scheme`;

        console.log(`🔍 Groww Search: ${cleanName}`);

        const searchResponse = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 15000
        });

        if (!searchResponse.data.content || searchResponse.data.content.length === 0) {
            console.log(`❌ No funds found in Groww search for: ${name}`);
            return res.status(404).json({ error: "Fund not found on Groww", searchedFor: name });
        }

        // Score-based matching for best result
        let fund = null;
        let bestScore = 0;
        const results = searchResponse.data.content;

        for (const f of results) {
            const title = f.title?.toLowerCase() || '';
            const searchId = f.search_id?.toLowerCase() || '';
            const combined = title + ' ' + searchId; // Check both title and search_id
            let score = 0;
            let typeMatched = 0;

            // Must be Direct plan (check both title and search_id)
            if (!combined.includes('direct')) continue;

            // AMC must match (if we identified one) - use word boundary for short AMC names
            if (amcName) {
                // For short AMC names that could be prefixes (like 'quant'), use word boundary
                const needsWordBoundary = ['quant', 'jm', 'uti', 'dsp', 'sbi', 'lic'].includes(amcName);
                if (needsWordBoundary) {
                    const regex = new RegExp(`\\b${amcName}\\b`, 'i');
                    if (!regex.test(combined)) continue;
                } else {
                    if (!combined.includes(amcName)) continue;
                }
            }
            score += 10;

            // Fund type keywords matching - MANDATORY if we have keywords
            // If original fund has "small cap", result MUST have "small" in title/id
            for (const kw of fundTypeKeywords) {
                if (combined.includes(kw)) {
                    score += 5;
                    typeMatched++;
                }
            }

            // If we have fund type keywords but none matched, skip this result
            // This is critical to prevent Small Cap matching to Index funds
            if (fundTypeKeywords.length > 0 && typeMatched === 0) continue;

            // Prefer Growth over IDCW/Dividend
            if (combined.includes('growth')) score += 3;
            if (combined.includes('idcw') || combined.includes('dividend')) score -= 5;

            // Penalize index funds when original is not an index fund
            if (combined.includes('index') && !fundTypeKeywords.includes('index')) score -= 10;

            // Penalize mismatched fund types (e.g., "large & mid" when searching for just "mid")
            const originalHasLarge = originalNameLower.includes('large');
            const resultHasLarge = combined.includes('large');
            if (resultHasLarge && !originalHasLarge) score -= 8;

            // Penalize FoF (Fund of Funds) when original is not FoF
            if (combined.includes('fof') && !originalNameLower.includes('fof')) score -= 5;

            if (score > bestScore) {
                bestScore = score;
                fund = f;
            }
        }

        // Fallback if no score-based match
        if (!fund && results.length > 0) {
            console.log(`⚠️ No strict match, using first Direct result`);
            fund = results.find(f => {
                const combined = (f.title?.toLowerCase() || '') + ' ' + (f.search_id?.toLowerCase() || '');
                return combined.includes('direct');
            }) || results[0];
        }

        if (!fund) {
            console.log(`❌ No matching fund found for: ${name}`);
            return res.status(404).json({ error: 'No matching fund found on Groww', searchedFor: name });
        }

        console.log(`✅ Best match (score:${bestScore}): ${fund.title} (search_id: ${fund.search_id})`);

        if (!fund.search_id) {
            console.log(`❌ No search_id for fund: ${fund.title}`);
            return res.status(404).json({ error: "Fund search_id not found" });
        }

        // Step 2: Fetch scheme details including holdings
        const schemeUrl = `https://groww.in/v1/api/data/mf/web/v4/scheme/search/${fund.search_id}`;
        console.log(`📊 Fetching scheme data: ${schemeUrl}`);

        const schemeResponse = await axios.get(schemeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://groww.in',
                'Referer': 'https://groww.in/'
            },
            timeout: 15000
        });

        const holdingsRaw = schemeResponse.data.holdings;

        if (!holdingsRaw || !Array.isArray(holdingsRaw) || holdingsRaw.length === 0) {
            console.log(`❌ No holdings data found for: ${name}`);
            return res.status(404).json({ error: "Holdings data not found" });
        }

        console.log(`✅ Found ${holdingsRaw.length} holdings for ${name}`);

        // Process holdings
        const holdings = holdingsRaw.map(item => ({
            name: item.company_name || "Unknown",
            sector: item.sector_name || "Equity",
            allocation: item.corpus_per ? item.corpus_per.toFixed(2) : "0.00",
            return1y: null,
            return3y: null,
            return1m: null,
            isReal: true
        }));

        const response = {
            holdings,
            meta: {
                fund: schemeResponse.data.scheme_name || fund.title,
                requestedFund: name,
                schemeCode: schemeCode,
                totalHoldings: holdings.length,
                dataSource: 'Groww API',
                matchScore: bestScore,
                portfolioDate: holdingsRaw[0]?.portfolio_date || null,
                timestamp: new Date().toISOString()
            }
        };

        // Cache the result
        await redisSet(holdingsCacheKey, response);
        holdingsCache.set(holdingsCacheKey, response);
        console.log(`✅ Cached from Groww API: ${name} (${holdings.length} holdings)`);

        return res.json(response);
    } catch (error) {
        console.error('Groww API error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch holdings from Groww' });
    }
}


app.get('/api/stock/details', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: "Stock name is required" });
    }

    try {
        const cacheKey = `stock_details_${name}`;
        const cachedDetails = stockDetailsCache.get(cacheKey);

        if (cachedDetails) {
            console.log(`Returning cached stock details for: ${name}`);
            return res.json(cachedDetails);
        }

        const details = await fetchStockDetailsFromTV(name);

        if (!details) {
            return res.status(404).json({ error: "Stock details not found" });
        }

        stockDetailsCache.set(cacheKey, details);
        res.json(details);
    } catch (error) {
        console.error('Error fetching stock details:', error);
        res.status(500).json({ error: "Failed to fetch stock details" });
    }
});

// Stock Returns Endpoint - fetches 1M, 1Y, 3Y returns for a stock
app.get('/api/stock/returns', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: "Stock name is required" });
    }

    try {
        const cacheKey = `stock_returns_${name}`;

        // Check Redis cache first
        const cachedReturns = await redisGet(cacheKey);
        if (cachedReturns) {
            console.log(`📦 Redis HIT (stock returns): ${name}`);
            return res.json(cachedReturns);
        }

        // Check memory cache
        const memCached = stockDetailsCache.get(cacheKey);
        if (memCached) {
            console.log(`📦 Memory HIT (stock returns): ${name}`);
            return res.json(memCached);
        }

        console.log(`📊 Fetching returns from TradingView for: ${name}`);
        const returns = await fetchReturnsFromTV(name);

        if (!returns) {
            return res.json({ return1m: null, return1y: null, return3y: null });
        }

        // Cache the result
        await redisSet(cacheKey, returns, 28800); // 8 hours
        stockDetailsCache.set(cacheKey, returns);

        res.json(returns);
    } catch (error) {
        console.error(`Error fetching stock returns for ${name}:`, error);
        res.json({ return1m: null, return1y: null, return3y: null });
    }
});

// ============ KOTAK NEO API INTEGRATION ============

// Kotak API Configuration
const KOTAK_ACCESS_TOKEN = process.env.KOTAK_ACCESS_TOKEN || '8b8fd30e-a2de-4914-ba8b-795c8ef663cb';
const KOTAK_MOBILE = process.env.KOTAK_MOBILE || '+918851415822';
const KOTAK_UCC = process.env.KOTAK_UCC || 'Y6QV2';
const KOTAK_MPIN = process.env.KOTAK_MPIN || '270108';

// Kotak session state
let kotakSession = {
    tradingToken: null,
    sid: null,
    baseUrl: null,
    expiresAt: 0
};

// Cache for ETF and scrip data
const etfCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
const scripMasterCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

// Popular ETF symbols for quick access
const POPULAR_ETF_SYMBOLS = [
    '14597', '13335', '14599', '11536', '11532', // NIFTYBEES, BANKBEES, GOLDBEES, etc.
];

// Kotak API Login (TOTP required - cached result)
const loginKotak = async (totp) => {
    try {
        // Step 1: TOTP Login
        const loginRes = await fetch('https://mis.kotaksecurities.com/login/1.0/tradeApiLogin', {
            method: 'POST',
            headers: {
                'Authorization': KOTAK_ACCESS_TOKEN,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mobileNumber: KOTAK_MOBILE,
                ucc: KOTAK_UCC,
                totp: totp
            })
        });

        const loginData = await loginRes.json();
        if (!loginData.data?.token) {
            console.error('Kotak TOTP login failed:', loginData);
            return null;
        }

        // Step 2: MPIN Validate
        const validateRes = await fetch('https://mis.kotaksecurities.com/login/1.0/tradeApiValidate', {
            method: 'POST',
            headers: {
                'Authorization': KOTAK_ACCESS_TOKEN,
                'neo-fin-key': 'neotradeapi',
                'sid': loginData.data.sid,
                'Auth': loginData.data.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mpin: KOTAK_MPIN })
        });

        const validateData = await validateRes.json();
        if (!validateData.data?.baseUrl) {
            console.error('Kotak MPIN validation failed:', validateData);
            return null;
        }

        // Save session
        kotakSession = {
            tradingToken: validateData.data.token,
            sid: validateData.data.sid,
            baseUrl: validateData.data.baseUrl,
            expiresAt: Date.now() + (23 * 60 * 60 * 1000) // ~23 hours
        };

        console.log('✅ Kotak session created successfully');
        return kotakSession;
    } catch (error) {
        console.error('Kotak login error:', error);
        return null;
    }
};

// Get quotes without full authentication (uses access token directly)
const getKotakQuotes = async (symbols, exchange = 'nse_cm') => {
    try {
        // Use a working base URL from previous successful calls
        const baseUrl = kotakSession.baseUrl || 'https://mis.kotaksecurities.com';
        const query = symbols.map(s => `${exchange}|${s}`).join(',');
        const url = `${baseUrl}/script-details/1.0/quotes/neosymbol/${encodeURIComponent(query)}/all`;

        const response = await fetch(url, {
            headers: {
                'Authorization': KOTAK_ACCESS_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Kotak quotes fetch failed:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching Kotak quotes:', error);
        return null;
    }
};

// Endpoint: Get market indices (Nifty 50, Bank Nifty, etc.)
app.get('/api/kotak/indices', async (req, res) => {
    try {
        const cacheKey = 'kotak_indices';
        const cached = etfCache.get(cacheKey);
        if (cached && !req.query.refresh) {
            return res.json(cached);
        }

        // Try Kotak API first
        try {
            const baseUrl = kotakSession.baseUrl || 'https://mis.kotaksecurities.com';
            const url = `${baseUrl}/script-details/1.0/quotes/neosymbol/nse_cm|Nifty 50,nse_cm|Nifty Bank,nse_cm|NIFTY IT,nse_cm|NIFTY MID 50,nse_cm|NIFTY FIN SERVICE,bse_cm|SENSEX/all`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, {
                headers: { 'Authorization': KOTAK_ACCESS_TOKEN },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data) && data.length > 0) {
                    const formattedData = data.map(item => ({
                        symbol: item.exchange_token || item.display_symbol,
                        displayName: item.display_symbol || item.exchange_token,
                        exchange: item.exchange,
                        ltp: parseFloat(item.ltp) || 0,
                        change: parseFloat(item.change) || 0,
                        perChange: parseFloat(item.per_change) || 0,
                        isError: false
                    }));

                    // Ensure we have all 6 indices
                    const indexNames = ['NIFTY 50', 'BANK NIFTY', 'NIFTY IT', 'NIFTY MIDCAP 50', 'NIFTY FIN SERVICES', 'SENSEX'];
                    const missingIndices = indexNames.filter(name =>
                        !formattedData.some(d => d.displayName?.toUpperCase().includes(name.split(' ')[0]))
                    );

                    missingIndices.forEach(name => {
                        formattedData.push({
                            symbol: name,
                            displayName: name,
                            ltp: 0,
                            change: 0,
                            perChange: 0,
                            isError: true
                        });
                    });

                    etfCache.set(cacheKey, formattedData.slice(0, 6), 60);
                    return res.json(formattedData.slice(0, 6));
                }
            }
        } catch (kotakError) {
            console.log('Kotak API unavailable:', kotakError.message);
        }

        // Fallback: Return placeholder data for all 6 indices
        // This ensures the UI always shows the 6 index cards
        console.log('📊 Using placeholder data for indices');
        const placeholderData = [
            { symbol: 'NIFTY50', displayName: 'NIFTY 50', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'BANKNIFTY', displayName: 'BANK NIFTY', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'NIFTYIT', displayName: 'NIFTY IT', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'NIFTYMIDCAP50', displayName: 'NIFTY MIDCAP 50', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'NIFTYFINSERVICE', displayName: 'NIFTY FIN SERVICES', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'SENSEX', displayName: 'SENSEX', ltp: 0, change: 0, perChange: 0, isError: true }
        ];

        res.json(placeholderData);
    } catch (error) {
        console.error('Error in /api/kotak/indices:', error);
        res.json([
            { symbol: 'NIFTY50', displayName: 'NIFTY 50', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'BANKNIFTY', displayName: 'BANK NIFTY', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'NIFTYIT', displayName: 'NIFTY IT', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'NIFTYMIDCAP50', displayName: 'NIFTY MIDCAP 50', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'NIFTYFINSERVICE', displayName: 'NIFTY FIN SERVICES', ltp: 0, change: 0, perChange: 0, isError: true },
            { symbol: 'SENSEX', displayName: 'SENSEX', ltp: 0, change: 0, perChange: 0, isError: true }
        ]);
    }
});

// Endpoint: Get Live Quotes for any symbols
app.get('/api/kotak/quotes', async (req, res) => {
    try {
        const { symbols, exchange = 'nse_cm' } = req.query;
        if (!symbols) {
            return res.status(400).json({ error: 'Symbols required' });
        }

        const symbolList = symbols.split(',');
        const cacheKey = `kotak_quotes_${exchange}_${symbols}`;

        const cached = etfCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const quotes = await getKotakQuotes(symbolList, exchange);
        if (quotes) {
            etfCache.set(cacheKey, quotes);
            return res.json(quotes);
        }

        res.json([]);
    } catch (error) {
        console.error('Error in /api/kotak/quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

// Endpoint: Get ETF list with static data (no auth required)
app.get('/api/etf-prices', async (req, res) => {
    try {
        // Popular Indian ETFs with real information
        const popularETFs = [
            { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', type: 'Index ETF', aum: '34000 Cr', expense: '0.04%', ltp: 265.50, change: 2.30, perChange: 0.87 },
            { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', type: 'Banking ETF', aum: '8900 Cr', expense: '0.19%', ltp: 485.30, change: -3.20, perChange: -0.66 },
            { symbol: 'JUNIORBEES', name: 'Nippon India ETF Nifty Next 50 Junior BeES', type: 'Index ETF', aum: '3200 Cr', expense: '0.10%', ltp: 720.15, change: 5.40, perChange: 0.76 },
            { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'Gold ETF', aum: '7500 Cr', expense: '0.59%', ltp: 58.20, change: 0.35, perChange: 0.60 },
            { symbol: 'ITBEES', name: 'Nippon India ETF Nifty IT', type: 'Sector ETF', aum: '4100 Cr', expense: '0.22%', ltp: 42.15, change: -0.85, perChange: -1.98 },
            { symbol: 'SETFNIFTY', name: 'SBI ETF Nifty 50', type: 'Index ETF', aum: '2800 Cr', expense: '0.07%', ltp: 263.80, change: 2.10, perChange: 0.80 },
            { symbol: 'SETFNIF50', name: 'SBI Nifty 50 ETF', type: 'Index ETF', aum: '1900 Cr', expense: '0.07%', ltp: 264.20, change: 2.15, perChange: 0.82 },
            { symbol: 'CPSE', name: 'Nippon India ETF CPSE', type: 'PSU ETF', aum: '2100 Cr', expense: '0.07%', ltp: 85.60, change: 1.20, perChange: 1.42 },
            { symbol: 'PSUBNKBEES', name: 'Nippon India ETF PSU Bank BeES', type: 'Banking ETF', aum: '1800 Cr', expense: '0.19%', ltp: 98.45, change: 1.55, perChange: 1.60 },
            { symbol: 'MOM50', name: 'Motilal Oswal Nifty 50 ETF', type: 'Index ETF', aum: '1500 Cr', expense: '0.05%', ltp: 262.90, change: 2.05, perChange: 0.79 },
            { symbol: 'SILVERBEES', name: 'Nippon India Silver ETF', type: 'Silver ETF', aum: '2400 Cr', expense: '0.40%', ltp: 78.30, change: 0.85, perChange: 1.10 },
            { symbol: 'HDFCNIFTY', name: 'HDFC Nifty 50 ETF', type: 'Index ETF', aum: '1100 Cr', expense: '0.05%', ltp: 264.00, change: 2.12, perChange: 0.81 },
            { symbol: 'ICICIBANKP', name: 'ICICI Pru Bank ETF', type: 'Banking ETF', aum: '800 Cr', expense: '0.22%', ltp: 64.25, change: -0.45, perChange: -0.70 },
            { symbol: 'KOTAKNIFTY', name: 'Kotak Nifty 50 ETF', type: 'Index ETF', aum: '700 Cr', expense: '0.12%', ltp: 263.50, change: 2.08, perChange: 0.80 },
            { symbol: 'PHARMABEES', name: 'Nippon India ETF Nifty Pharma', type: 'Sector ETF', aum: '600 Cr', expense: '0.22%', ltp: 21.85, change: 0.25, perChange: 1.16 },
        ];

        res.json(popularETFs);
    } catch (error) {
        console.error('Error in /api/etf-prices:', error);
        res.status(500).json({ error: 'Failed to fetch ETF prices' });
    }
});

// Endpoint: Get ETF list with prices
app.get('/api/kotak/etfs', async (req, res) => {
    try {
        const cacheKey = 'kotak_etfs';
        const cached = etfCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Get scrip master to find ETF symbols
        let etfs = scripMasterCache.get('etf_list');

        if (!etfs) {
            // Fetch scrip master and filter ETFs
            const baseUrl = kotakSession.baseUrl || 'https://mis.kotaksecurities.com';
            const pathsRes = await fetch(`${baseUrl}/script-details/1.0/masterscrip/file-paths`, {
                headers: { 'Authorization': KOTAK_ACCESS_TOKEN }
            });

            if (pathsRes.ok) {
                const pathsData = await pathsRes.json();
                const nseFile = pathsData.data.filesPaths.find(p => p.includes('nse_cm'));

                if (nseFile) {
                    const csvRes = await fetch(nseFile);
                    const csvText = await csvRes.text();

                    // Parse CSV and find ETFs
                    const lines = csvText.split('\n');
                    etfs = [];

                    for (let i = 1; i < lines.length && etfs.length < 50; i++) {
                        const line = lines[i].toLowerCase();
                        if (line.includes('etf') || line.includes('bees')) {
                            const cols = lines[i].split(',');
                            etfs.push({
                                symbol: cols[0],
                                name: cols[12] || cols[4],
                                tradingSymbol: cols[5],
                                isin: cols[8],
                                pSymbol: cols[0]
                            });
                        }
                    }

                    scripMasterCache.set('etf_list', etfs);
                }
            }
        }

        if (!etfs || etfs.length === 0) {
            // Return popular ETFs as fallback
            etfs = [
                { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', type: 'Index ETF' },
                { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', type: 'Index ETF' },
                { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'Gold ETF' },
                { symbol: 'SETFNIFTY', name: 'SBI ETF Nifty 50', type: 'Index ETF' },
                { symbol: 'ITBEES', name: 'Nippon India ETF Nifty IT', type: 'Sector ETF' }
            ];
        }

        // Get live prices for ETFs
        const symbols = etfs.slice(0, 20).map(e => e.tradingSymbol || e.symbol);
        const baseUrl = kotakSession.baseUrl || 'https://mis.kotaksecurities.com';
        const query = symbols.map(s => `nse_cm|${s}`).join(',');

        try {
            const quotesRes = await fetch(
                `${baseUrl}/script-details/1.0/quotes/neosymbol/${encodeURIComponent(query)}/ltp`,
                { headers: { 'Authorization': KOTAK_ACCESS_TOKEN } }
            );

            if (quotesRes.ok) {
                const quotes = await quotesRes.json();
                const priceMap = {};
                quotes.forEach(q => {
                    priceMap[q.exchange_token] = {
                        ltp: parseFloat(q.ltp),
                        change: parseFloat(q.change || 0),
                        perChange: parseFloat(q.per_change || 0)
                    };
                });

                etfs = etfs.map(etf => ({
                    ...etf,
                    ...priceMap[etf.tradingSymbol || etf.symbol] || { ltp: 0, change: 0, perChange: 0 }
                }));
            }
        } catch (e) {
            console.warn('Could not fetch ETF prices:', e.message);
        }

        etfCache.set(cacheKey, etfs);
        res.json(etfs);
    } catch (error) {
        console.error('Error in /api/kotak/etfs:', error);
        res.status(500).json({ error: 'Failed to fetch ETFs' });
    }
});

// Endpoint: Search ETFs
app.get('/api/kotak/search-etf', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const etfs = scripMasterCache.get('etf_list') || [];
        const query = q.toLowerCase();

        const results = etfs.filter(etf =>
            (etf.name && etf.name.toLowerCase().includes(query)) ||
            (etf.symbol && etf.symbol.toLowerCase().includes(query))
        ).slice(0, 10);

        res.json(results);
    } catch (error) {
        console.error('Error in /api/kotak/search-etf:', error);
        res.json([]);
    }
});

// Endpoint: Kotak login with TOTP (manual trigger)
app.post('/api/kotak/login', async (req, res) => {
    try {
        const { totp } = req.body;
        if (!totp) {
            return res.status(400).json({ error: 'TOTP required' });
        }

        const session = await loginKotak(totp);
        if (session) {
            res.json({
                success: true,
                message: 'Kotak session created',
                expiresAt: session.expiresAt
            });
        } else {
            res.status(401).json({ error: 'Login failed' });
        }
    } catch (error) {
        console.error('Error in /api/kotak/login:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Endpoint: Kotak session status
app.get('/api/kotak/status', (req, res) => {
    res.json({
        hasSession: !!kotakSession.tradingToken,
        isExpired: Date.now() > kotakSession.expiresAt,
        baseUrl: kotakSession.baseUrl
    });
});

// ============ TOP FUNDS PRE-CALCULATION ============

const MFAPI_BASE = 'https://api.mfapi.in/mf';
const TOP_FUNDS_CACHE_KEY = 'top_funds_calculated';
const TOP_FUNDS_TTL = 86400; // 24 hours

// Calculate returns from NAV history
const calculateReturns = (navHistory) => {
    if (!navHistory || navHistory.length < 2) return null;

    const currentNav = parseFloat(navHistory[0].nav);

    const getNavAtDays = (days) => {
        if (navHistory.length <= days) return parseFloat(navHistory[navHistory.length - 1].nav);
        return parseFloat(navHistory[Math.min(days, navHistory.length - 1)].nav);
    };

    const calcReturn = (days) => {
        const pastNav = getNavAtDays(days);
        if (!pastNav || pastNav === 0) return 0;
        return (((currentNav - pastNav) / pastNav) * 100);
    };

    return {
        '1M': calcReturn(22),   // ~22 trading days
        '3M': calcReturn(66),   // ~66 trading days
        '6M': calcReturn(130),  // ~130 trading days  
        '1Y': calcReturn(252),  // ~252 trading days
    };
};

// Fetch fund details and calculate returns
const fetchFundWithReturns = async (schemeCode) => {
    try {
        const response = await axios.get(`${MFAPI_BASE}/${schemeCode}`, { timeout: 5000 });
        const data = response.data;

        if (!data || !data.data || !data.meta) return null;

        const returns = calculateReturns(data.data);
        if (!returns) return null;

        return {
            id: schemeCode,
            name: data.meta.scheme_name,
            category: data.meta.fund_house,
            nav: parseFloat(data.data[0]?.nav || 0),
            returns,
            sixMonthReturn: returns['6M']
        };
    } catch (error) {
        // Silently fail for individual funds
        return null;
    }
};

// Pre-calculate top funds and store in Redis
const calculateTopFunds = async () => {
    console.log('🔄 Starting top funds calculation...');

    try {
        // Get list of all funds from MFAPI
        const listResponse = await axios.get(MFAPI_BASE, { timeout: 10000 });
        const allFunds = listResponse.data;

        if (!allFunds || !Array.isArray(allFunds)) {
            console.error('Failed to fetch fund list');
            return null;
        }

        // Sample 100 funds (reduced from 500 for faster response)
        // Prioritize Direct Growth plans
        const directGrowthFunds = allFunds.filter(f =>
            f.schemeName.toLowerCase().includes('direct') &&
            f.schemeName.toLowerCase().includes('growth')
        ).slice(0, 100);

        const fundsToProcess = directGrowthFunds.length >= 50
            ? directGrowthFunds
            : allFunds.slice(0, 100);

        console.log(`📊 Processing ${fundsToProcess.length} funds...`);

        // Process in batches - faster now (20 batch, 200ms delay)
        const BATCH_SIZE = 20;
        const DELAY_BETWEEN_BATCHES = 200; // 200ms (reduced from 1 second)
        const processedFunds = [];

        for (let i = 0; i < fundsToProcess.length; i += BATCH_SIZE) {
            const batch = fundsToProcess.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(f => fetchFundWithReturns(f.schemeCode));
            const batchResults = await Promise.all(batchPromises);

            processedFunds.push(...batchResults.filter(f => f !== null));

            // Progress log
            console.log(`📈 Processed ${Math.min(i + BATCH_SIZE, fundsToProcess.length)}/${fundsToProcess.length} funds`);

            // Delay between batches
            if (i + BATCH_SIZE < fundsToProcess.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }

        // Sort by 6-month return and take top 50
        const topFunds = processedFunds
            .filter(f => f && typeof f.sixMonthReturn === 'number' && !isNaN(f.sixMonthReturn))
            .sort((a, b) => b.sixMonthReturn - a.sixMonthReturn)
            .slice(0, 50)
            .map((f, index) => ({
                ...f,
                rank: index + 1,
                returns: {
                    '1M': f.returns['1M']?.toFixed(2) || '0.00',
                    '3M': f.returns['3M']?.toFixed(2) || '0.00',
                    '6M': f.returns['6M']?.toFixed(2) || '0.00',
                    '1Y': f.returns['1Y']?.toFixed(2) || '0.00'
                }
            }));

        const result = {
            funds: topFunds,
            meta: {
                totalProcessed: processedFunds.length,
                timestamp: new Date().toISOString(),
                source: 'MFAPI (pre-calculated)'
            }
        };

        // Store in Redis
        await redisSet(TOP_FUNDS_CACHE_KEY, result, TOP_FUNDS_TTL);
        console.log(`✅ Top funds calculated: ${topFunds.length} funds stored in cache`);

        return result;
    } catch (error) {
        console.error('Top funds calculation error:', error.message);
        return null;
    }
};

// API endpoint for top funds
app.get('/api/top-funds', async (req, res) => {
    const { limit = 20, sortBy = '6M' } = req.query;

    try {
        // Check Redis cache first
        let topFundsData = await redisGet(TOP_FUNDS_CACHE_KEY);

        if (!topFundsData) {
            console.log('📦 Cache miss, calculating top funds...');
            topFundsData = await calculateTopFunds();

            if (!topFundsData) {
                return res.status(500).json({ error: 'Failed to calculate top funds' });
            }
        } else {
            console.log('📦 Returning cached top funds');
        }

        // Sort by requested period
        let sortedFunds = [...topFundsData.funds];
        if (sortBy && ['1M', '3M', '6M', '1Y'].includes(sortBy)) {
            sortedFunds.sort((a, b) =>
                parseFloat(b.returns[sortBy]) - parseFloat(a.returns[sortBy])
            );
        }

        res.json({
            funds: sortedFunds.slice(0, parseInt(limit)),
            meta: {
                ...topFundsData.meta,
                sortedBy: sortBy,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Top funds API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch top funds' });
    }
});

// Trigger recalculation endpoint (for manual refresh)
app.post('/api/top-funds/refresh', async (req, res) => {
    console.log('🔄 Manual top funds refresh triggered');
    const result = await calculateTopFunds();
    if (result) {
        res.json({ success: true, message: `Recalculated ${result.funds.length} top funds` });
    } else {
        res.status(500).json({ error: 'Recalculation failed' });
    }
});

// Schedule daily recalculation at 5 AM IST (23:30 UTC previous day)
cron.schedule('30 23 * * *', () => {
    console.log('🌅 Running daily top funds recalculation...');
    calculateTopFunds().catch(err => console.error('Daily recalc error:', err));
});

// ============ AUTHENTICATION SYSTEM ============

const readUsers = async () => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeUsers = async (users) => {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // MongoDB Path
        if (User) {
            const existingUser = await User.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            const newUser = new User({
                username,
                email,
                password: hashedPassword
            });

            await newUser.save();

            const token = jwt.sign(
                { id: newUser._id, username: newUser.username, email: newUser.email, isPro: newUser.isPro },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                token,
                user: { id: newUser._id, username: newUser.username, email: newUser.email, isPro: newUser.isPro }
            });
        }

        // File-based Fallback
        const users = await readUsers();
        const existingUser = users.find(u => u.email === email || u.username === username);

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            isPro: false
        };

        users.push(newUser);
        await writeUsers(users);

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email, isPro: false },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email, isPro: false }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: 'Credentials required' });
        }

        let user;

        // MongoDB Path
        if (User) {
            user = await User.findOne({
                $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
            });
        } else {
            // File-based Fallback
            const users = await readUsers();
            user = users.find(u => u.email === emailOrUsername || u.username === emailOrUsername);
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userId = user._id || user.id;

        const token = jwt.sign(
            { id: userId, username: user.username, email: user.email, isPro: user.isPro || false },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: userId, username: user.username, email: user.email, isPro: user.isPro || false }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Helper to check and update subscription status
const checkAndUpdateSubscription = async (user) => {
    if (!user.isPro || !user.subscriptionExpiry) {
        return user;
    }

    const now = new Date();
    const expiryDate = new Date(user.subscriptionExpiry);
    const gracePeriodEnd = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000); // +24 hours

    // If past grace period, downgrade to free
    if (now > gracePeriodEnd) {
        if (User && user instanceof User) {
            user.isPro = false;
            user.subscriptionExpiry = null;
            await user.save();
            return user;
        } else {
            const users = await readUsers();
            const userIndex = users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                users[userIndex].isPro = false;
                users[userIndex].subscriptionExpiry = null;
                await writeUsers(users);
                return users[userIndex];
            }
        }
    }

    return user;
};

app.get('/api/auth/user', authenticateToken, async (req, res) => {
    let user;

    if (User) {
        try {
            user = await User.findById(req.user.id);
        } catch (e) {
            // Handle invalid ObjectId if switching from file to DB
            user = null;
        }
    }

    if (!user) {
        const users = await readUsers();
        user = users.find(u => u.id === req.user.id);
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    // Update subscription status
    user = await checkAndUpdateSubscription(user);

    // Calculate subscription metadata
    let subscriptionData = {
        isPro: user.isPro || false
    };

    if (user.isPro && user.subscriptionExpiry) {
        const now = new Date();
        const expiryDate = new Date(user.subscriptionExpiry);
        const gracePeriodEnd = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000);

        // Calculate days remaining
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / msPerDay));

        // Check if in grace period
        const isGracePeriod = now > expiryDate && now <= gracePeriodEnd;

        subscriptionData = {
            ...subscriptionData,
            subscriptionExpiry: user.subscriptionExpiry,
            daysRemaining: daysRemaining,
            isGracePeriod: isGracePeriod
        };
    }

    res.json({
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            ...subscriptionData
        }
    });
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Delete account endpoint
app.delete('/api/auth/account', authenticateToken, async (req, res) => {
    try {
        const users = await readUsers();
        const filteredUsers = users.filter(u => u.id !== req.user.id);

        if (users.length === filteredUsers.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        await writeUsers(filteredUsers);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== WATCHLIST ENDPOINTS =====
// Note: Watchlist model is imported at the top with User model

// Get all watchlists for user
app.get('/api/watchlist', authenticateToken, async (req, res) => {
    try {
        if (!Watchlist) {
            return res.status(503).json({ error: 'Watchlist service not available' });
        }

        const watchlists = await Watchlist.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({ watchlists });
    } catch (error) {
        console.error('Get watchlists error:', error);
        res.status(500).json({ error: 'Failed to fetch watchlists' });
    }
});

// Create new watchlist
app.post('/api/watchlist', authenticateToken, async (req, res) => {
    try {
        console.log('📝 Creating watchlist - User:', req.user?.id, 'Body:', JSON.stringify(req.body));

        if (!Watchlist) {
            console.error('❌ Watchlist model not loaded!');
            return res.status(503).json({ error: 'Watchlist service not available' });
        }

        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Watchlist name is required' });
        }

        const userId = req.user.id?.toString() || req.user._id?.toString();
        console.log('📝 Creating watchlist with userId:', userId, 'name:', name.trim());

        const watchlist = new Watchlist({
            userId: userId,
            name: name.trim(),
            items: []
        });

        console.log('📝 Watchlist document to save:', JSON.stringify(watchlist.toObject()));

        await watchlist.save();
        console.log(`✅ Created watchlist "${name}" for user ${userId}`);
        res.status(201).json({ watchlist });
    } catch (error) {
        console.error('❌ Create watchlist error:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error name:', error.name);
        res.status(500).json({ error: 'Failed to create watchlist: ' + error.message });
    }
});

// Rename watchlist
app.put('/api/watchlist/:id', authenticateToken, async (req, res) => {
    try {
        if (!Watchlist) {
            return res.status(503).json({ error: 'Watchlist service not available' });
        }

        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'New name is required' });
        }

        const watchlist = await Watchlist.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { name: name.trim(), updatedAt: new Date() },
            { new: true }
        );

        if (!watchlist) {
            return res.status(404).json({ error: 'Watchlist not found' });
        }

        res.json({ watchlist });
    } catch (error) {
        console.error('Rename watchlist error:', error);
        res.status(500).json({ error: 'Failed to rename watchlist' });
    }
});

// Delete watchlist
app.delete('/api/watchlist/:id', authenticateToken, async (req, res) => {
    try {
        if (!Watchlist) {
            return res.status(503).json({ error: 'Watchlist service not available' });
        }

        const result = await Watchlist.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!result) {
            return res.status(404).json({ error: 'Watchlist not found' });
        }

        res.json({ message: 'Watchlist deleted successfully' });
    } catch (error) {
        console.error('Delete watchlist error:', error);
        res.status(500).json({ error: 'Failed to delete watchlist' });
    }
});

// Add item to watchlist
app.post('/api/watchlist/:id/items', authenticateToken, async (req, res) => {
    try {
        if (!Watchlist) {
            return res.status(503).json({ error: 'Watchlist service not available' });
        }

        const { type, itemId, name } = req.body;

        if (!type || !['mf', 'stock', 'etf'].includes(type)) {
            return res.status(400).json({ error: 'Valid type (mf, stock, etf) is required' });
        }
        if (!itemId || !name) {
            return res.status(400).json({ error: 'itemId and name are required' });
        }

        const watchlist = await Watchlist.findOne({ _id: req.params.id, userId: req.user.id });

        if (!watchlist) {
            return res.status(404).json({ error: 'Watchlist not found' });
        }

        // Check if item already exists in this watchlist
        const exists = watchlist.items.some(item => item.itemId === itemId && item.type === type);
        if (exists) {
            return res.status(400).json({ error: 'Item already in watchlist' });
        }

        watchlist.items.push({ type, itemId, name, addedAt: new Date() });
        await watchlist.save();

        console.log(`✅ Added ${type} "${name}" to watchlist "${watchlist.name}"`);
        res.json({ watchlist });
    } catch (error) {
        console.error('Add item error:', error);
        res.status(500).json({ error: 'Failed to add item to watchlist' });
    }
});

// Remove item from watchlist
app.delete('/api/watchlist/:id/items/:itemId', authenticateToken, async (req, res) => {
    try {
        if (!Watchlist) {
            return res.status(503).json({ error: 'Watchlist service not available' });
        }

        const watchlist = await Watchlist.findOne({ _id: req.params.id, userId: req.user.id });

        if (!watchlist) {
            return res.status(404).json({ error: 'Watchlist not found' });
        }

        const initialLength = watchlist.items.length;
        watchlist.items = watchlist.items.filter(item => item._id.toString() !== req.params.itemId);

        if (watchlist.items.length === initialLength) {
            return res.status(404).json({ error: 'Item not found in watchlist' });
        }

        await watchlist.save();
        res.json({ watchlist });
    } catch (error) {
        console.error('Remove item error:', error);
        res.status(500).json({ error: 'Failed to remove item from watchlist' });
    }
});

// Market news endpoint
app.get('/api/news', authenticateToken, async (req, res) => {
    try {
        res.json({
            news: newsCache,
            lastUpdated: lastNewsUpdate
        });
    } catch (error) {
        console.error('News error:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// ============ PAYMENT ROUTES ============

app.post('/api/payment/create-order', authenticateToken, async (req, res) => {
    try {
        const orderId = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const requestPayload = {
            order_amount: 50.00,
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
                customer_id: req.user.id,
                customer_phone: "9999999999",
                customer_name: req.user.username,
                customer_email: req.user.email
            },
            order_meta: {
                return_url: `https://www.cashfree.com/devstudio/preview/pg/web/popupCheckout?order_id=${orderId}`
            }
        };

        const postData = JSON.stringify(requestPayload);

        const options = {
            hostname: 'api.cashfree.com',
            port: 443,
            path: '/pg/orders',
            method: 'POST',
            headers: {
                'x-client-id': CASHFREE_APP_ID.trim(),
                'x-client-secret': CASHFREE_SECRET.trim(),
                'x-api-version': '2025-01-01',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log("Creating Cashfree order...");

        const cashfreeRequest = https.request(options, (cashfreeRes) => {
            let data = '';

            cashfreeRes.on('data', (chunk) => {
                data += chunk;
            });

            cashfreeRes.on('end', () => {
                try {
                    const responseData = JSON.parse(data);

                    if (cashfreeRes.statusCode === 200) {
                        console.log("Order Created Successfully");
                        res.json(responseData);
                    } else {
                        console.error("Cashfree Error:", responseData);
                        res.status(cashfreeRes.statusCode).json({ error: responseData.message || "Failed to create order" });
                    }
                } catch (parseError) {
                    console.error("Error parsing response:", parseError);
                    res.status(500).json({ error: "Invalid response from payment gateway" });
                }
            });
        });

        cashfreeRequest.on('error', (error) => {
            console.error("Request Error:", error);
            res.status(500).json({ error: "Failed to connect to payment gateway" });
        });

        cashfreeRequest.write(postData);
        cashfreeRequest.end();

    } catch (error) {
        console.error("Error creating order:", error.message);
        res.status(500).json({ error: "Failed to create order" });
    }
});

app.post('/api/payment/verify', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.body;

        const options = {
            hostname: 'api.cashfree.com',
            port: 443,
            path: `/pg/orders/${orderId}/payments`,
            method: 'GET',
            headers: {
                'x-client-id': CASHFREE_APP_ID.trim(),
                'x-client-secret': CASHFREE_SECRET.trim(),
                'x-api-version': '2025-01-01',
                'Accept': 'application/json'
            }
        };

        console.log("Verifying payment...");

        const cashfreeRequest = https.request(options, (cashfreeRes) => {
            let data = '';

            cashfreeRes.on('data', (chunk) => {
                data += chunk;
            });

            cashfreeRes.on('end', async () => {
                try {
                    const payments = JSON.parse(data);

                    const successfulPayment = Array.isArray(payments) ?
                        payments.find(payment => payment.payment_status === "SUCCESS") : null;

                    if (successfulPayment) {
                        const users = await readUsers();
                        const userIndex = users.findIndex(u => u.id === req.user.id);

                        if (userIndex !== -1) {
                            const subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                            users[userIndex].isPro = true;
                            users[userIndex].subscriptionExpiry = subscriptionExpiry;
                            await writeUsers(users);

                            return res.json({
                                success: true,
                                message: "Subscription activated",
                                user: {
                                    id: users[userIndex].id,
                                    username: users[userIndex].username,
                                    email: users[userIndex].email,
                                    isPro: true,
                                    subscriptionExpiry: subscriptionExpiry,
                                    daysRemaining: 30,
                                    isGracePeriod: false
                                }
                            });
                        }
                    }

                    res.json({ success: false, message: "Payment not verified" });
                } catch (parseError) {
                    console.error("Error parsing verification response:", parseError);
                    res.status(500).json({ error: "Invalid response from payment gateway" });
                }
            });
        });

        cashfreeRequest.on('error', (error) => {
            console.error("Request Error:", error);
            res.status(500).json({ error: "Failed to connect to payment gateway" });
        });

        cashfreeRequest.end();

    } catch (error) {
        console.error("Error verifying payment:", error.message);
        res.status(500).json({ error: "Verification failed" });
    }
});

// Renewal endpoint
app.post('/api/payment/renew', authenticateToken, async (req, res) => {
    try {
        const orderId = `RENEW_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const requestPayload = {
            order_amount: 50.00,
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
                customer_id: req.user.id,
                customer_phone: "9999999999",
                customer_name: req.user.username,
                customer_email: req.user.email
            },
            order_meta: {
                return_url: `https://www.cashfree.com/devstudio/preview/pg/web/popupCheckout?order_id=${orderId}`
            }
        };

        const postData = JSON.stringify(requestPayload);

        const options = {
            hostname: 'api.cashfree.com',
            port: 443,
            path: '/pg/orders',
            method: 'POST',
            headers: {
                'x-client-id': CASHFREE_APP_ID.trim(),
                'x-client-secret': CASHFREE_SECRET.trim(),
                'x-api-version': '2025-01-01',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log("Creating Cashfree renewal order...");

        const cashfreeRequest = https.request(options, (cashfreeRes) => {
            let data = '';

            cashfreeRes.on('data', (chunk) => {
                data += chunk;
            });

            cashfreeRes.on('end', () => {
                try {
                    const responseData = JSON.parse(data);

                    if (cashfreeRes.statusCode === 200) {
                        console.log("Renewal Order Created Successfully");
                        res.json(responseData);
                    } else {
                        console.error("Cashfree Error:", responseData);
                        res.status(cashfreeRes.statusCode).json({ error: responseData.message || "Failed to create renewal order" });
                    }
                } catch (parseError) {
                    console.error("Error parsing response:", parseError);
                    res.status(500).json({ error: "Invalid response from payment gateway" });
                }
            });
        });

        cashfreeRequest.on('error', (error) => {
            console.error("Request Error:", error);
            res.status(500).json({ error: "Failed to connect to payment gateway" });
        });

        cashfreeRequest.write(postData);
        cashfreeRequest.end();

    } catch (error) {
        console.error("Error creating renewal order:", error.message);
        res.status(500).json({ error: "Failed to create renewal order" });
    }
});

// ============ GEMINI AI ROUTES ============

app.post('/api/ai/analyze', authenticateToken, async (req, res) => {
    try {
        if (!genAI) {
            return res.status(503).json({
                error: 'AI service not configured',
                message: 'Please add GEMINI_API_KEY to enable AI features'
            });
        }

        const { fundName, fundData, userQuestion } = req.body;

        if (!fundName) {
            return res.status(400).json({ error: 'Fund name is required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are FundX AI, an expert mutual fund advisor. Analyze this mutual fund and provide concise, actionable insights.

Fund Name: ${fundName}
${fundData ? `
NAV: ₹${fundData.nav || 'N/A'}
1Y Return: ${fundData.oneYearReturn || 'N/A'}%
3Y Return: ${fundData.threeYearReturn || 'N/A'}%
Category: ${fundData.category || 'N/A'}
AUM: ${fundData.aum || 'N/A'}
` : ''}

${userQuestion ? `User Question: ${userQuestion}` : 'Provide a comprehensive analysis covering performance, risk level, and suitability.'}

Respond in 3-4 short paragraphs. Be specific and actionable.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysis = response.text();

        res.json({
            analysis,
            fundName,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI analysis error:', error);
        res.status(500).json({
            error: 'AI analysis failed',
            message: error.message
        });
    }
});

// SPA fallback - must be last route
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Cache Warming - Pre-fetch popular funds on startup
const POPULAR_FUNDS = [
    'Tata Nifty Auto Index Fund',
    'ICICI Prudential Bluechip Fund',
    'SBI Bluechip Fund',
    'HDFC Top 100 Fund',
    'Axis Bluechip Fund',
    'Mirae Asset Large Cap Fund',
    'Kotak Bluechip Fund',
    'Nippon India Large Cap Fund'
];

const warmCache = async () => {
    if (!redis) {
        console.log('⚠️ Redis not available, skipping cache warming');
        return;
    }

    console.log('🔥 Starting cache warming for popular funds...');

    for (const fundName of POPULAR_FUNDS) {
        const cacheKey = `holdings_${fundName}`;

        // Check if already cached
        const existing = await redisGet(cacheKey);
        if (existing) {
            console.log(`✅ Already cached: ${fundName}`);
            continue;
        }

        try {
            console.log(`📥 Pre-fetching: ${fundName}`);

            // Make internal fetch to our own holdings endpoint
            const baseSlug = fundName
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            const slug = `${baseSlug}-direct-growth`;
            const pageUrl = `https://groww.in/mutual-funds/${slug}`;

            const nextData = await fetchPageWithPuppeteer(pageUrl);

            if (nextData) {
                const findKey = (obj, key) => {
                    if (obj && typeof obj === 'object') {
                        if (obj[key]) return obj[key];
                        for (const k in obj) {
                            const result = findKey(obj[k], key);
                            if (result) return result;
                        }
                    }
                    return null;
                };

                const holdingsRaw = findKey(nextData, "holdings");

                if (holdingsRaw && Array.isArray(holdingsRaw)) {
                    const holdings = holdingsRaw.map(item => ({
                        name: item.company_name || "Unknown",
                        sector: item.sector_name || "Equity",
                        allocation: item.corpus_per ? item.corpus_per.toFixed(2) : "0.00"
                    }));

                    const response = {
                        holdings,
                        meta: {
                            fund: fundName,
                            totalHoldings: holdings.length,
                            dataSource: 'Groww (Pre-cached)',
                            timestamp: new Date().toISOString()
                        }
                    };

                    await redisSet(cacheKey, response);
                    console.log(`✅ Pre-cached: ${fundName} (${holdings.length} holdings)`);
                }
            }

            // Wait between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
            console.warn(`❌ Failed to pre-cache ${fundName}:`, error.message);
        }
    }

    console.log('🔥 Cache warming complete!');
};

// Cache warming disabled - causes resource issues on Render free tier
// Use RapidAPI for holdings data instead (see implementation_plan.md)
// setTimeout(() => {
//     warmCache().catch(err => console.error('Cache warming error:', err));
// }, 10000);

// Daily cache refresh also disabled
// cron.schedule('30 0 * * *', () => {
//     console.log('🔄 Running daily cache refresh...');
//     warmCache().catch(err => console.error('Daily cache refresh error:', err));
// });

// ===== IPO ENDPOINTS =====
console.log('📈 Registering IPO endpoints...');
const ipoCache = new NodeCache({ stdTTL: 1800 }); // 30 min cache

// Scrape IPO data from investorgain.com
async function scrapeIPOData() {
    const cacheKey = 'ipo_data';

    // Check memory cache
    const cached = ipoCache.get(cacheKey);
    if (cached) {
        console.log('📦 IPO data from memory cache');
        return cached;
    }

    // Check Redis cache
    if (redis) {
        try {
            const redisData = await redis.get(cacheKey);
            if (redisData) {
                console.log('📦 IPO data from Redis cache');
                ipoCache.set(cacheKey, redisData);
                return redisData;
            }
        } catch (e) {
            console.warn('Redis IPO cache read error:', e.message);
        }
    }

    console.log('🔄 Scraping IPO data from investorgain.com...');

    try {
        const response = await axios.get('https://www.investorgain.com/report/live-ipo-gmp/331/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const ipos = [];

        // Parse the IPO table
        $('table tbody tr').each((index, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 6) {
                const name = $(cells[0]).text().trim();
                const priceText = $(cells[1]).text().trim();
                const gmpText = $(cells[2]).text().trim();
                const estListingText = $(cells[3]).text().trim();
                const fireRatingText = $(cells[4]).text().trim();
                const dateText = $(cells[5]).text().trim();

                // Skip if not a valid IPO row
                if (!name || name.length < 2) return;

                // Parse price (handle ranges like "₹200 to ₹210")
                const priceMatch = priceText.match(/₹?\s*(\d+(?:\.\d+)?)/g);
                const issuePrice = priceMatch ? parseFloat(priceMatch[priceMatch.length - 1].replace('₹', '').trim()) : null;

                // Parse GMP
                const gmpMatch = gmpText.match(/-?\d+/);
                const gmp = gmpMatch ? parseInt(gmpMatch[0]) : 0;

                // Parse estimated listing price
                const estMatch = estListingText.match(/₹?\s*(\d+(?:\.\d+)?)/);
                const estListingPrice = estMatch ? parseFloat(estMatch[1]) : (issuePrice ? issuePrice + gmp : null);

                // Parse fire rating (count of 🔥 emojis)
                const fireRating = (fireRatingText.match(/🔥/g) || []).length;

                // Determine status based on date text
                let status = 'upcoming';
                let openDate = null;
                let closeDate = null;
                let listingDate = null;

                const dateTextLower = dateText.toLowerCase();
                if (dateTextLower.includes('listed') || dateTextLower.includes('closed')) {
                    status = 'closed';
                } else if (dateTextLower.includes('open') || dateTextLower.includes('ongoing') || dateTextLower.includes('live')) {
                    status = 'ongoing';
                }

                // Try to extract dates (format varies)
                const dateMatches = dateText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi);
                if (dateMatches && dateMatches.length >= 1) {
                    openDate = dateMatches[0];
                    if (dateMatches.length >= 2) {
                        closeDate = dateMatches[1];
                    }
                }

                // Calculate expected listing gain %
                const expectedGainPercent = issuePrice ? ((gmp / issuePrice) * 100).toFixed(1) : null;

                // Determine IPO type (SME vs Mainboard)
                const isSME = name.toLowerCase().includes('sme') || (issuePrice && issuePrice < 100);

                ipos.push({
                    name: name.replace(/\s*(SME|IPO)\s*/gi, ' ').trim(),
                    issuePrice,
                    gmp,
                    estListingPrice,
                    expectedGainPercent: expectedGainPercent ? parseFloat(expectedGainPercent) : null,
                    fireRating,
                    status,
                    openDate,
                    closeDate,
                    listingDate,
                    type: isSME ? 'SME' : 'Mainboard',
                    listingGain: null,
                    listingPrice: null,
                    subscription: null
                });
            }
        });

        // Sort by fire rating and GMP
        ipos.sort((a, b) => {
            if (b.fireRating !== a.fireRating) return b.fireRating - a.fireRating;
            return (b.gmp || 0) - (a.gmp || 0);
        });

        const result = {
            upcoming: ipos.filter(i => i.status === 'upcoming'),
            ongoing: ipos.filter(i => i.status === 'ongoing'),
            closed: ipos.filter(i => i.status === 'closed').slice(0, 20), // Limit closed IPOs
            lastUpdated: new Date().toISOString()
        };

        // Cache the results
        ipoCache.set(cacheKey, result);
        if (redis) {
            try {
                await redis.set(cacheKey, result, { ex: 1800 });
                console.log('💾 IPO data cached to Redis');
            } catch (e) {
                console.warn('Redis IPO cache write error:', e.message);
            }
        }

        console.log(`✅ Scraped ${ipos.length} IPOs: ${result.upcoming.length} upcoming, ${result.ongoing.length} ongoing, ${result.closed.length} closed`);
        return result;

    } catch (error) {
        console.error('❌ IPO scraping error:', error.message);

        // Return fallback data if scraping fails
        return {
            upcoming: [],
            ongoing: [],
            closed: [],
            lastUpdated: new Date().toISOString(),
            error: 'Failed to fetch IPO data. Please try again later.'
        };
    }
}

// IPO routes are now defined EARLY in the file (around line 41) to ensure they work
// The original routes below are commented out to avoid duplicates:

// // GET /api/ipo - Get all IPO data (MOVED TO TOP OF FILE)
// app.get('/api/ipo', async (req, res) => {
//     try {
//         const data = await scrapeIPOData();
//         res.json(data);
//     } catch (error) {
//         console.error('IPO endpoint error:', error);
//         res.status(500).json({ error: 'Failed to fetch IPO data' });
//     }
// });

// // GET /api/ipo/:status - Get IPOs by status (upcoming/ongoing/closed)
// app.get('/api/ipo/:status', async (req, res) => {
//     try {
//         const { status } = req.params;
//         if (!['upcoming', 'ongoing', 'closed'].includes(status)) {
//             return res.status(400).json({ error: 'Invalid status. Use: upcoming, ongoing, or closed' });
//         }

//         const data = await scrapeIPOData();
//         res.json({
//             ipos: data[status] || [],
//             lastUpdated: data.lastUpdated
//         });
//     } catch (error) {
//         console.error('IPO status endpoint error:', error);
//         res.status(500).json({ error: 'Failed to fetch IPO data' });
//     }
// });

// Serve static files AFTER all API routes to prevent catching /api/* requests
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback - serve index.html for all non-API routes (React Router support)
app.get('/{*splat}', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
