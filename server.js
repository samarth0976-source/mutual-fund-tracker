import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import YahooFinance from 'yahoo-finance2';
import puppeteer from 'puppeteer';
import axios from 'axios';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = 'your-secret-key-change-this-in-production';
const USERS_FILE = path.join(__dirname, 'users.json');

// Caches with different TTLs for different data types
const searchCache = new NodeCache({ stdTTL: 86400 }); // 24 hours for search results
const holdingsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour for holdings (faster refresh)
const yahooFinance = new YahooFinance();

app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Helper to fetch real returns using Yahoo Data
const fetchRealReturns = async (symbol) => {
    try {
        const queryOptions = { period1: '2020-01-01', interval: '1mo' }; // Fetch enough history

        try {
            const chart = await yahooFinance.chart(symbol, queryOptions);
            if (!chart || !chart.quotes || chart.quotes.length === 0) return null;

            const quotes = chart.quotes;
            const currentPrice = quotes[quotes.length - 1].close;
            const currentDate = new Date(quotes[quotes.length - 1].date);

            const findPriceAtDate = (targetDate) => {
                let closest = null;
                let minDiff = Infinity;
                for (const q of quotes) {
                    const qDate = new Date(q.date);
                    const diff = Math.abs(qDate - targetDate);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = q;
                    }
                }
                // If closest is more than 1 month away, consider it missing
                if (minDiff > 30 * 24 * 3600 * 1000) return null;
                return closest ? closest.close : null;
            };

            const d1m = new Date(currentDate); d1m.setMonth(d1m.getMonth() - 1);
            const d1y = new Date(currentDate); d1y.setFullYear(d1y.getFullYear() - 1);
            const d3y = new Date(currentDate); d3y.setFullYear(d3y.getFullYear() - 3);

            const p1m = findPriceAtDate(d1m);
            const p1y = findPriceAtDate(d1y);
            const p3y = findPriceAtDate(d3y);

            const calculateReturn = (current, old) => {
                if (!old) return null;
                return ((current - old) / old) * 100;
            };

            return {
                return1m: calculateReturn(currentPrice, p1m)?.toFixed(2) || null,
                return1y: calculateReturn(currentPrice, p1y)?.toFixed(2) || null,
                return3y: calculateReturn(currentPrice, p3y)?.toFixed(2) || null
            };

        } catch (yError) {
            console.error(`Yahoo Error for ${symbol}:`, yError.message);
            return null;
        }

    } catch (e) {
        console.error(`Error fetching for ${symbol}:`, e.message);
        return null;
    }
};

// Helper to fetch page with Puppeteer
const fetchPageWithPuppeteer = async (url) => {
    console.log(`Fetching page with Puppeteer: ${url}`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const nextData = await page.evaluate(() => {
            const script = document.getElementById('__NEXT_DATA__');
            return script ? JSON.parse(script.innerHTML) : null;
        });
        return nextData;
    } catch (e) {
        console.error("Puppeteer error:", e.message);
        return null;
    } finally {
        await browser.close();
    }
};

const BATCH_SIZE = 10; // Increased from 5 for faster processing
const DELAY_MS = 50; // Reduced from 200ms for faster completion
const GROWW_SEARCH_URL = "https://groww.in/v1/api/search/v1/entity?app=false&page=0&q=";

const processBatch = async (batch) => {
    return Promise.all(batch.map(async (item) => {
        console.log(`Processing item: ${item.company_name}`);
        let realReturns = null;
        try {
            if (!item.company_name) {
                console.warn("Item missing company_name:", item);
                throw new Error("Missing company_name");
            }

            // Hybrid: Search Yahoo using company name from Groww
            const yahooSearch = await yahooFinance.search(item.company_name);
            if (yahooSearch.quotes && yahooSearch.quotes.length > 0) {
                const symbol = yahooSearch.quotes[0].symbol;
                console.log(`Found symbol for ${item.company_name}: ${symbol}`);
                realReturns = await fetchRealReturns(symbol);
            } else {
                console.log(`No Yahoo symbol found for: ${item.company_name}`);
            }
        } catch (e) {
            console.error(`Error processing ${item.company_name}:`, e.message);
        }

        console.log(`Finished item: ${item.company_name}`);
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
        // Check holdings cache first (1 hour TTL)
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

        // Step 1: Search for the fund to get its Slug (using axios as it works)
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        let slug;
        let fundTitle = name; // Default to query name
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
                    fundTitle = fund.title || name; // Update fundTitle if found
                    searchCache.set(cacheKey, slug);
                    console.log(`Found fund: ${fund.title} (Slug: ${slug})`);
                }
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    console.warn("Groww Search Rate Limit (429). Using fallback if available.");
                    // Fallback for known funds if rate limited
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

        // Step 2: Fetch the Public Page with Puppeteer
        const pageUrl = `https://groww.in/mutual-funds/${slug}`;
        const nextData = await fetchPageWithPuppeteer(pageUrl);

        if (!nextData) {
            console.log("Failed to fetch data with Puppeteer");
            return res.status(500).json({ error: "Failed to fetch page data" });
        }

        // Helper to find key recursively
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

        // Step 3: Transform Data
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

        // Return processed holdings with metadata
        const response = {
            holdings: processedHoldings,
            meta: {
                fund: fundTitle,
                totalHoldings: processedHoldings.length,
                dataSource: 'Groww (via Puppeteer)',
                timestamp: new Date().toISOString()
            }
        };

        // Store in cache for future requests (1 hour TTL)
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

// ============ AUTHENTICATION SYSTEM ============

// Helper functions for user management
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

// Middleware to verify JWT token
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

// Signup route
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const users = await readUsers();
        const existingUser = users.find(u => u.email === email || u.username === username);

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        await writeUsers(users);

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: 'Credentials required' });
        }

        const users = await readUsers();
        const user = users.find(u => u.email === emailOrUsername || u.username === emailOrUsername);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user
app.get('/api/auth/user', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
