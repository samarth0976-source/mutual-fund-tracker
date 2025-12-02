import puppeteer from 'puppeteer';

async function scrapeGroww() {
    const url = 'https://groww.in/mutual-funds/quant-small-cap-fund-direct-plan-growth';
    console.log(`Scraping URL: ${url}`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("Page loaded");

        const content = await page.content();

        // Extract __NEXT_DATA__
        const nextData = await page.evaluate(() => {
            const script = document.getElementById('__NEXT_DATA__');
            return script ? JSON.parse(script.innerHTML) : null;
        });

        if (nextData) {
            console.log("Found __NEXT_DATA__");

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

            const holdings = findKey(nextData, "holdings");
            if (holdings) {
                console.log(`Found ${holdings.length} holdings`);
                console.log("First 3:", JSON.stringify(holdings.slice(0, 3), null, 2));
            } else {
                console.log("Holdings not found in NEXT_DATA");
            }
        } else {
            console.log("__NEXT_DATA__ not found");
        }

    } catch (e) {
        console.error("Scraping failed:", e.message);
    } finally {
        await browser.close();
    }
}

scrapeGroww();
