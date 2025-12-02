import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function testYahoo() {
    const name = "ICICI Prudential Plan I - Year Plus Plan-Growth-Direct";
    console.log(`Searching Yahoo for: ${name}`);

    try {
        const searchResult = await yahooFinance.search(name);
        if (!searchResult.quotes || searchResult.quotes.length === 0) {
            console.log("Fund not found in Yahoo search");
            return;
        }

        const fund = searchResult.quotes[0];
        console.log(`Found fund: ${fund.shortname} (${fund.symbol})`);

        const quoteSummary = await yahooFinance.quoteSummary(fund.symbol, { modules: ['topHoldings'] });

        if (!quoteSummary.topHoldings || !quoteSummary.topHoldings.holdings) {
            console.log("Holdings data not found in Yahoo");
            return;
        }

        const holdings = quoteSummary.topHoldings.holdings;
        console.log(`Found ${holdings.length} holdings`);
        console.log("First 3:", JSON.stringify(holdings.slice(0, 3), null, 2));

    } catch (e) {
        console.error("Yahoo Error:", e.message);
    }
}

testYahoo();
