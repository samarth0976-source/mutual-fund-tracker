import axios from 'axios';

// Placeholder key - User needs to replace this
const API_KEY = 'TYvsr54aHi7OBuXntmZQJgTUWsYdhp77';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Clean company name to improve search matches
const cleanName = (name) => {
    return name
        .replace(/\s(Ltd\.|Limited|LTD|LIMITED)\.?$/i, '')
        .replace(/\s\(India\)$/i, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();
};

export const searchSymbol = async (companyName) => {
    if (API_KEY === 'YOUR_API_KEY') {
        console.warn("FMP API Key is missing. Please provide a valid key.");
        return null;
    }

    try {
        // First try exact search
        const url = `${BASE_URL}/search?query=${encodeURIComponent(companyName)}&limit=1&apikey=${API_KEY}`;
        const response = await axios.get(url);

        if (response.data && response.data.length > 0) {
            // Prefer Indian stocks (.NS or .BO)
            const indianStock = response.data.find(s => s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO'));
            if (indianStock) return indianStock.symbol;
            return response.data[0].symbol;
        }

        // Retry with cleaned name
        const cleaned = cleanName(companyName);
        if (cleaned !== companyName) {
            const retryUrl = `${BASE_URL}/search?query=${encodeURIComponent(cleaned)}&limit=1&apikey=${API_KEY}`;
            const retryResponse = await axios.get(retryUrl);
            if (retryResponse.data && retryResponse.data.length > 0) {
                const indianStock = retryResponse.data.find(s => s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO'));
                if (indianStock) return indianStock.symbol;
                return retryResponse.data[0].symbol;
            }
        }

        return null;
    } catch (error) {
        console.error(`FMP Search Error for ${companyName}:`, error.message);
        return null;
    }
};

export const fetchStockProfile = async (symbol) => {
    if (!symbol) return null;
    try {
        const url = `${BASE_URL}/profile/${symbol}?apikey=${API_KEY}`;
        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
            return response.data[0];
        }
        return null;
    } catch (error) {
        console.error(`FMP Profile Error for ${symbol}:`, error.message);
        return null;
    }
};

export const fetchStockChange = async (symbol) => {
    if (!symbol) return null;
    try {
        const url = `${BASE_URL}/stock-price-change/${symbol}?apikey=${API_KEY}`;
        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
            return response.data[0];
        }
        return null;
    } catch (error) {
        console.error(`FMP Change Error for ${symbol}:`, error.message);
        return null;
    }
};

// Bulk fetch function (if we have a list of symbols)
export const fetchBulkProfiles = async (symbols) => {
    if (!symbols || symbols.length === 0) return [];
    try {
        // FMP allows comma separated tickers
        const tickerString = symbols.join(',');
        const url = `${BASE_URL}/profile/${tickerString}?apikey=${API_KEY}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`FMP Bulk Profile Error:`, error.message);
        return [];
    }
};
