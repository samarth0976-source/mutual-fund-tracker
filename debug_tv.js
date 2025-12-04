import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TradingView = require('@mathieuc/tradingview');

const client = new TradingView.Client();
const chart = new client.Session.Chart();

chart.setMarket('NSE:RELIANCE', {
    timeframe: 'D',
    range: 1000, // Try to request 1000 bars
});

chart.onUpdate(() => {
    if (!chart.periods || chart.periods.length === 0) return;

    const currentPrice = chart.periods[0].close;
    const periods = chart.periods;

    console.log(`\nData received for ${chart.infos.description} (${chart.infos.currency_id})`);
    console.log(`Current Price: ${currentPrice}`);
    console.log(`Total Bars: ${periods.length}`);
    console.log(`First Bar Date: ${new Date(periods[periods.length - 1].time * 1000).toISOString()}`);
    console.log(`Last Bar Date: ${new Date(periods[0].time * 1000).toISOString()}`);

    // Calculate returns
    // 1 Day Return (vs yesterday)
    // 1 Year Return (vs ~365 days ago)
    // 3 Year Return (vs ~3*365 days ago)

    const findClosePriceAtDate = (targetDate) => {
        // Find bar closest to targetDate
        // periods are usually sorted new to old (0 is newest)
        // TradingView timestamps are seconds
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

    const p1y = findClosePriceAtDate(d1y);
    const p3y = findClosePriceAtDate(d3y);

    console.log(`Price 1 Year Ago: ${p1y}`);
    console.log(`Price 3 Years Ago: ${p3y}`);

    if (p1y) console.log(`1Y Return: ${((currentPrice - p1y) / p1y * 100).toFixed(2)}%`);
    if (p3y) console.log(`3Y Return: ${((currentPrice - p3y) / p3y * 100).toFixed(2)}%`);

    client.end();
});

chart.onError((...err) => {
    console.error('Chart error:', ...err);
    client.end();
});
