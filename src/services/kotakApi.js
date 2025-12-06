// Kotak Neo API Service for ETFs and Live Market Data
// This service provides real-time quotes for ETFs and market indices

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Cache for ETF and quote data
let etfCache = null;
let etfCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Popular ETFs from Kotak scrip master
export const POPULAR_ETFS = [
    { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', type: 'Index ETF' },
    { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', type: 'Index ETF' },
    { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'Gold ETF' },
    { symbol: 'SETFNIFTY', name: 'SBI ETF Nifty 50', type: 'Index ETF' },
    { symbol: 'SETFNIFBK', name: 'SBI ETF Nifty Bank', type: 'Index ETF' },
    { symbol: 'HDFCNIFTY', name: 'HDFC Nifty 50 ETF', type: 'Index ETF' },
    { symbol: 'ITBEES', name: 'Nippon India ETF Nifty IT', type: 'Sector ETF' },
    { symbol: 'JUNIORBEES', name: 'Nippon India ETF Junior BeES', type: 'Index ETF' },
    { symbol: 'CPSEETF', name: 'CPSE ETF', type: 'Thematic ETF' },
    { symbol: 'LIQUIDBEES', name: 'Nippon India ETF Liquid BeES', type: 'Debt ETF' }
];

// Market indices
export const MARKET_INDICES = [
    { symbol: 'Nifty 50', displayName: 'NIFTY 50', exchange: 'nse_cm' },
    { symbol: 'Nifty Bank', displayName: 'BANK NIFTY', exchange: 'nse_cm' },
    { symbol: 'Nifty IT', displayName: 'NIFTY IT', exchange: 'nse_cm' },
    { symbol: 'SENSEX', displayName: 'SENSEX', exchange: 'bse_cm' }
];

/**
 * Fetches live quotes from Kotak API via backend
 * @param {string[]} symbols - Array of symbols to fetch
 * @param {string} exchange - Exchange segment (nse_cm, bse_cm)
 * @returns {Promise<Array>} Array of quote objects
 */
export const getLiveQuotes = async (symbols, exchange = 'nse_cm') => {
    try {
        const response = await fetch(
            `${BACKEND_URL}/api/kotak/quotes?symbols=${encodeURIComponent(symbols.join(','))}&exchange=${exchange}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch quotes');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching live quotes:', error);
        return [];
    }
};

/**
 * Fetches market indices data
 * @returns {Promise<Array>} Array of index quote objects
 */
export const getMarketIndices = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/kotak/indices`);

        if (!response.ok) {
            throw new Error('Failed to fetch market indices');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching market indices:', error);
        // Return mock data if API fails
        return MARKET_INDICES.map(idx => ({
            ...idx,
            ltp: '---',
            change: '0',
            perChange: '0',
            isLoading: true
        }));
    }
};

/**
 * Fetches ETF prices with caching
 * @param {string[]} symbols - Optional specific symbols to fetch
 * @returns {Promise<Array>} Array of ETF data with prices
 */
export const getETFPrices = async (symbols = null) => {
    try {
        // Check cache
        const now = Date.now();
        if (etfCache && (now - etfCacheTime < CACHE_DURATION)) {
            if (symbols) {
                return etfCache.filter(etf => symbols.includes(etf.symbol));
            }
            return etfCache;
        }

        const response = await fetch(`${BACKEND_URL}/api/kotak/etfs`);

        if (!response.ok) {
            throw new Error('Failed to fetch ETF prices');
        }

        const data = await response.json();

        // Update cache
        etfCache = data;
        etfCacheTime = now;

        if (symbols) {
            return data.filter(etf => symbols.includes(etf.symbol));
        }
        return data;
    } catch (error) {
        console.error('Error fetching ETF prices:', error);
        // Return popular ETFs with loading state
        return POPULAR_ETFS.map(etf => ({
            ...etf,
            ltp: '---',
            change: '0',
            perChange: '0',
            isLoading: true
        }));
    }
};

/**
 * Fetches scrip master (list of all tradeable instruments)
 * @param {string} segment - Exchange segment (nse_cm, bse_cm, nse_fo, etc.)
 * @returns {Promise<Array>} Array of instrument objects
 */
export const getScripMaster = async (segment = 'nse_cm') => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/kotak/scrip-master?segment=${segment}`);

        if (!response.ok) {
            throw new Error('Failed to fetch scrip master');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching scrip master:', error);
        return [];
    }
};

/**
 * Search ETFs by name or symbol
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching ETFs
 */
export const searchETFs = async (query) => {
    if (!query || query.length < 2) return [];

    try {
        const response = await fetch(`${BACKEND_URL}/api/kotak/search-etf?q=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error('Failed to search ETFs');
        }

        return await response.json();
    } catch (error) {
        console.error('Error searching ETFs:', error);
        return [];
    }
};

/**
 * Format price with Indian number format
 * @param {number|string} price - Price to format
 * @returns {string} Formatted price
 */
export const formatPrice = (price) => {
    if (price === '---' || price === null || price === undefined) return '---';
    const num = parseFloat(price);
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

/**
 * Get change color class based on value
 * @param {number|string} change - Change value
 * @returns {string} CSS class name
 */
export const getChangeColor = (change) => {
    const val = parseFloat(change);
    if (val > 0) return 'text-green-500';
    if (val < 0) return 'text-red-500';
    return 'text-gray-400';
};

export default {
    getLiveQuotes,
    getMarketIndices,
    getETFPrices,
    getScripMaster,
    searchETFs,
    formatPrice,
    getChangeColor,
    POPULAR_ETFS,
    MARKET_INDICES
};
