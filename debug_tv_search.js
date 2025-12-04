import TradingView from '@mathieuc/tradingview';

const cleanCompanyName = (name) => {
    if (!name) return "";
    let cleaned = name.trim();
    cleaned = cleaned.replace(/\s+Ltd\.?$/i, '')
        .replace(/\s+Limited$/i, '')
        .replace(/\s+India$/i, '')
        .replace(/\s+Inds\.?$/i, '')
        .replace(/\s+Industries$/i, '')
        .replace(/\s+Holdings$/i, '')
        .replace(/\s+Enterprises$/i, '')
        .replace(/\s+Corporation$/i, '')
        .replace(/\s+Corp\.?$/i, '');
    if (cleaned.includes("Mahindra & Mahindra")) return "M&M";
    return cleaned.trim();
};

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
                console.log(`[TV] No Indian stock found for "${stockName}". Retrying with shorter names...`);
                const words = stockName.split(' ');

                // Try first 2 words
                if (words.length > 2) {
                    const shortName = words.slice(0, 2).join(' ');
                    console.log(`[TV] Retrying with: "${shortName}"`);
                    const results2 = await TradingView.searchMarketV3(shortName);
                    match = findIndianStock(results2);
                }

                // Try first 1 word
                if (!match && words.length > 1) {
                    const shortName = words[0];
                    console.log(`[TV] Retrying with: "${shortName}"`);
                    const results3 = await TradingView.searchMarketV3(shortName);
                    match = findIndianStock(results3);
                }
            }

            if (!match) {
                console.log(`[TV] No symbol found for: ${stockName} (even after retries)`);
                // Fallback to first result if it exists (even if foreign), or null
                match = searchResults && searchResults.length > 0 ? searchResults[0] : null;
                if (!match) return resolve(null);
            }

            const symbol = `${match.exchange}:${match.symbol}`;
            console.log(`[TV] Selected symbol: ${symbol}`);

            const client = new TradingView.Client();
            const chart = new client.Session.Chart();

            chart.setMarket(symbol, {
                timeframe: 'D',
                range: 1200,
            });

            const timeout = setTimeout(() => {
                console.log(`[TV] Timeout for ${symbol}`);
                client.end();
                resolve(null);
            }, 10000); // 10s for debug

            chart.onUpdate(() => {
                if (!chart.periods || chart.periods.length === 0) return;

                const periods = chart.periods;
                const currentPrice = periods[0].close;
                console.log(`[TV] Price for ${symbol}: ${currentPrice}`);

                clearTimeout(timeout);
                client.end();
                resolve({ price: currentPrice });
            });

            chart.onError((...err) => {
                console.error(`[TV] Chart error for ${symbol}:`, ...err);
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

const test = async () => {
    const stocks = [
        "Reliance Industries Ltd.",
        "Tata Consultancy Services Ltd.",
        "HDFC Bank Ltd.",
        "Maruti Suzuki India Ltd.",
        "Quant Small Cap" // Intentional bad name
    ];

    for (const stock of stocks) {
        const cleaned = cleanCompanyName(stock);
        console.log(`\nTesting: "${stock}" -> Cleaned: "${cleaned}"`);
        await fetchReturnsFromTV(cleaned);
    }
};

test();
