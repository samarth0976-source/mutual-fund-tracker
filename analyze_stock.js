import fs from 'fs';

const data = JSON.parse(fs.readFileSync('stock_debug.json', 'utf8'));

const stockData = data.props.pageProps.stockData;
if (stockData) {
    console.log("StockData Keys:", Object.keys(stockData));
    if (stockData.return1y) console.log("Return 1Y:", stockData.return1y);
    if (stockData.return3y) console.log("Return 3Y:", stockData.return3y);
    if (stockData.priceData) {
        console.log("PriceData Keys:", Object.keys(stockData.priceData));
        console.log("PriceData:", JSON.stringify(stockData.priceData, null, 2));
    }
} else {
    console.log("stockData not found in props.pageProps");
    console.log("Keys in pageProps:", Object.keys(data.props.pageProps));
}
