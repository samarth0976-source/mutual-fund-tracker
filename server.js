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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Health Check Endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const USERS_FILE = path.join(__dirname, 'users.json');

// Cashfree Configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET;
const CASHFREE_BASE_URL = 'https://api.cashfree.com/pg/orders';

// Caches with different TTLs for different data types
const searchCache = new NodeCache({ stdTTL: 86400 }); // 24 hours for search results
const holdingsCache = new NodeCache({ stdTTL: 86400 }); // 24 hours for holdings
const fundDetailsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour for fund details
const stockDetailsCache = new NodeCache({ stdTTL: 28800 }); // 8 hours for stock details

// MongoDB Connection (optional - falls back to file-based if not configured)
const MONGODB_URI = process.env.MONGODB_URI;
let User = null;

const connectDB = async () => {
    if (!MONGODB_URI) {
        console.log('ℹ️  No MONGODB_URI found, using file-based storage');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000 // Fail fast if cannot connect
        });
        console.log('✅ Connected to MongoDB');

        // Dynamically import User model only if MongoDB is connected
        const { default: UserModel } = await import('./models/User.js');
        User = UserModel;
    } catch (error) {
        console.warn('⚠️  MongoDB connection failed, using file-based storage:', error.message);
    }
};

// Start DB connection in background
connectDB();

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

if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized');
} else {
    console.log('ℹ️  No GEMINI_API_KEY found, AI features disabled');
}

app.use(cors());
app.use(express.json());

// ... (rest of the file)

// In the AI endpoint (around line 840):
// const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

// Helper to fetch returns using TradingView API
const fetchReturnsFromTV = async (stockName) => {
    return new Promise(async (resolve) => {
        // console.log(`[TV] Searching for: ${stockName}`);

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
            // console.log(`[TV] Found symbol: ${symbol}`);

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
            // console.log(`Processing: ${cleanedName}`); // Reduce logging noise

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
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: "Fund name is required" });
    }

    try {
        const holdingsCacheKey = `holdings_${name}`;
        const cachedHoldings = holdingsCache.get(holdingsCacheKey);

        if (cachedHoldings) {
            console.log(`Returning cached holdings for: ${name}`);
            return res.json({
                ...cachedHoldings,
                meta: {
                    ...cachedHoldings.meta,
                    cached: true,
                    cachedAt: cachedHoldings.meta.timestamp
                }
            });
        }

        console.log(`Fetching fresh data for: ${name}`);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        let slug;
        let fundTitle = name;
        const cacheKey = `search_${name}`;
        const cachedSlug = searchCache.get(cacheKey);

        if (cachedSlug) {
            console.log(`Using cached slug for: ${name}`);
            slug = cachedSlug;
        } else {
            try {
                const searchResponse = await axios.get(`${GROWW_SEARCH_URL}${encodeURIComponent(name)}`, { headers });
                if (searchResponse.data && searchResponse.data.content && searchResponse.data.content.length > 0) {
                    const fund = searchResponse.data.content[0];
                    slug = fund.search_id;
                    fundTitle = fund.title || name;
                    searchCache.set(cacheKey, slug);
                    console.log(`Found fund: ${fund.title} (Slug: ${slug})`);
                }
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    console.warn("Groww Search Rate Limit (429). Using fallback if available.");
                    if (name.toLowerCase().includes("quant small cap")) {
                        slug = "quant-small-cap-fund-direct-plan-growth";
                        fundTitle = "Quant Small Cap Fund Direct Plan Growth";
                        console.log("Using hardcoded fallback slug for Quant Small Cap");
                    } else {
                        throw err;
                    }
                } else {
                    throw err;
                }
            }
        }

        if (!slug) {
            console.log(`Fund not found in search: ${name}`);
            return res.status(404).json({ error: "Fund not found" });
        }

        const pageUrl = `https://groww.in/mutual-funds/${slug}`;
        const nextData = await fetchPageWithPuppeteer(pageUrl);

        if (!nextData) {
            console.log("Failed to fetch data with Puppeteer");
            return res.status(500).json({ error: "Failed to fetch page data" });
        }

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

        if (!holdingsRaw || !Array.isArray(holdingsRaw)) {
            console.log("Holdings data not found in JSON");
            return res.status(404).json({ error: "Holdings data not found" });
        }

        console.log(`Found ${holdingsRaw.length} holdings`);

        const processedHoldings = [];
        for (let i = 0; i < holdingsRaw.length; i += BATCH_SIZE) {
            const batch = holdingsRaw.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(holdingsRaw.length / BATCH_SIZE)}`);
            const batchResults = await processBatch(batch);
            processedHoldings.push(...batchResults);

            if (i + BATCH_SIZE < holdingsRaw.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        const response = {
            holdings: processedHoldings,
            meta: {
                fund: fundTitle,
                totalHoldings: processedHoldings.length,
                dataSource: 'Groww (via Puppeteer)',
                timestamp: new Date().toISOString()
            }
        };

        holdingsCache.set(holdingsCacheKey, response);
        console.log(`Cached holdings for: ${name}`);

        res.json(response);

    } catch (error) {
        console.error('Error fetching holdings:', error.message);
        res.status(500).json({
            error: 'Failed to fetch data',
            details: error.message
        });
    }
});

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
```javascript
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
        const orderId = `RENEW_${ Date.now() }_${ Math.floor(Math.random() * 1000) }`;

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

// Catch-all handler for any request that doesn't match an API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
```
