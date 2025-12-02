import axios from 'axios';

// User provided keys
const API_KEY = 'eyJraWQiOiJaTUtjVXciLCJhbGciOiJFUzI1NiJ9.eyJleHAiOjI1NTMwNzIzMjMsImlhdCI6MTc2NDY3MjMyMywibmJmIjoxNzY0NjcyMzIzLCJzdWIiOiJ7XCJ0b2tlblJlZklkXCI6XCI3ZTFjZjVhNC0wNGNlLTQ0NTAtYTY5OS0yNGEyZjM5ZTMzMThcIixcInZlbmRvckludGVncmF0aW9uS2V5XCI6XCJlMzFmZjIzYjA4NmI0MDZjODg3NGIyZjZkODQ5NTMxM1wiLFwidXNlckFjY291bnRJZFwiOlwiNDBhNGJmYWQtMGZlNS00MTM3LTkzYzEtZTY0YmY0MTE1Y2RmXCIsXCJkZXZpY2VJZFwiOlwiYmYyMDljMDYtMTM2MS01NGE4LTg1NGMtZmQ4NzY3NThkNDJmXCIsXCJzZXNzaW9uSWRcIjpcImI4NmVhNTUzLTk4ZWYtNDA3Yy04ZmJlLWM2ZWRmZjc2MDJmYlwiLFwiYWRkaXRpb25hbERhdGFcIjpcIno1NC9NZzltdjE2WXdmb0gvS0EwYkgxa3BUdW5iZ3Rzc21mVzhDU0RTdGRSTkczdTlLa2pWZDNoWjU1ZStNZERhWXBOVi9UOUxIRmtQejFFQisybTdRPT1cIixcInJvbGVcIjpcImF1dGgtdG90cFwiLFwic291cmNlSXBBZGRyZXNzXCI6XCIxMDMuODcuNTcuMjQ3LDEwNC4yMy4yMTYuMTgxLDM1LjI0MS4yMy4xMjNcIixcInR3b0ZhRXhwaXJ5VHNcIjoyNTUzMDcyMzIzMDE5fSIsImlzcyI6ImFwZXgtYXV0aC1wcm9kLWFwcCJ9.hTMZ15J7Dqtdj-o9FP1UcIwODDHjsmvS5EhoT9oxsZD8y-4M2lSc5wjvXGJ0KHbr_5DFJBpQHTBq-iJNyniYwg';
const API_SECRET = 'plP-nszCNkI*d)HAo))9zM$VZ59P9zvD';

const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'X-API-KEY': API_SECRET,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Clean company name to improve search matches
const cleanName = (name) => {
    return name
        .replace(/\s(Ltd\.|Limited|LTD|LIMITED)\.?$/i, '')
        .replace(/\s\(India\)$/i, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();
};

export const searchSymbol = async (companyName) => {
    try {
        const cleanedName = cleanName(companyName);
        const searchUrl = `https://groww.in/v1/api/search/v1/entity?app=false&page=0&q=${encodeURIComponent(cleanedName)}`;
        const response = await axios.get(searchUrl, { headers: HEADERS });

        if (response.data && response.data.content && response.data.content.length > 0) {
            // Prefer NSE script code
            const stock = response.data.content.find(item => item.nse_scrip_code) || response.data.content[0];
            return stock.nse_scrip_code || stock.search_id;
        }
        return null;
    } catch (error) {
        console.error(`Groww Search Error for ${companyName}:`, error.message);
        return null;
    }
};

export const fetchStockReturns = async (symbol) => {
    if (!symbol) return null;
    try {
        // Fetch 5 years of data to cover 3Y return
        // Using daily interval - removing intervalInMinutes to get daily candles
        const chartUrl = `https://groww.in/v1/api/charting_service/v2/chart/exchange/NSE/segment/CASH/${symbol}/daily?minimal=true`;
        console.log(`Fetching Chart: ${chartUrl}`);
        const response = await axios.get(chartUrl, { headers: HEADERS });

        if (response.data && response.data.candles && response.data.candles.length > 0) {
            const candles = response.data.candles; // [[time, close], ...]
            console.log(`Candles: ${candles.length}, Start: ${candles[0][0]}, End: ${candles[candles.length - 1][0]}`);

            // Sort candles by time just in case
            candles.sort((a, b) => a[0] - b[0]);

            const currentPrice = candles[candles.length - 1][1];
            const currentTime = candles[candles.length - 1][0];

            const getPriceAtTime = (targetTime) => {
                // Find candle closest to targetTime
                let closest = null;
                let minDiff = Infinity;

                for (const candle of candles) {
                    const diff = Math.abs(candle[0] - targetTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = candle;
                    }
                }
                // If the closest candle is too far off (e.g. > 7 days), return null
                if (minDiff > 7 * 24 * 3600) return null;
                return closest ? closest[1] : null;
            };

            const oneMonthAgo = currentTime - (30 * 24 * 3600);
            const oneYearAgo = currentTime - (365 * 24 * 3600);
            const threeYearsAgo = currentTime - (3 * 365 * 24 * 3600);

            const price1m = getPriceAtTime(oneMonthAgo);
            const price1y = getPriceAtTime(oneYearAgo);
            const price3y = getPriceAtTime(threeYearsAgo);

            const calculateReturn = (current, old) => {
                if (!old) return null;
                return ((current - old) / old) * 100;
            };

            return {
                '1M': calculateReturn(currentPrice, price1m),
                '1Y': calculateReturn(currentPrice, price1y),
                '3Y': calculateReturn(currentPrice, price3y)
            };
        }
        return null;
    } catch (error) {
        console.error(`Groww Chart Error for ${symbol}:`, error.message);
        return null;
    }
};
