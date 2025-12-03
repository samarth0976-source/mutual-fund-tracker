const axios = require('axios');
const cheerio = require('cheerio');

class NewsScraper {
    constructor() {
        this.newsCache = [];
        this.lastUpdated = null;
    }

    async scrapeMoneycontrol() {
        try {
            const response = await axios.get('https://www.moneycontrol.com/news/business/markets/', {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const news = [];

            $('li.clearfix').slice(0, 5).each((i, elem) => {
                const title = $(elem).find('h2 a').text().trim();
                const link = $(elem).find('h2 a').attr('href');
                const time = $(elem).find('span').text().trim();

                if (title && link) {
                    news.push({
                        id: `mc_${Date.now()}_${i}`,
                        title,
                        url: link.startsWith('http') ? link : `https://www.moneycontrol.com${link}`,
                        source: 'Moneycontrol',
                        timestamp: new Date().toISOString(),
                        timeAgo: time || 'Recently'
                    });
                }
            });

            return news;
        } catch (error) {
            console.error('Moneycontrol scrape error:', error.message);
            return [];
        }
    }

    async scrapeEconomicTimes() {
        try {
            const response = await axios.get('https://economictimes.indiatimes.com/markets', {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const news = [];

            $('.eachStory').slice(0, 5).each((i, elem) => {
                const title = $(elem).find('h3').text().trim();
                const link = $(elem).find('a').attr('href');

                if (title && link) {
                    news.push({
                        id: `et_${Date.now()}_${i}`,
                        title,
                        url: link.startsWith('http') ? link : `https://economictimes.indiatimes.com${link}`,
                        source: 'ET Markets',
                        timestamp: new Date().toISOString(),
                        timeAgo: 'Recently'
                    });
                }
            });

            return news;
        } catch (error) {
            console.error('ET scrape error:', error.message);
            return [];
        }
    }

    async fetchAllNews() {
        try {
            const [mcNews, etNews] = await Promise.all([
                this.scrapeMoneycontrol(),
                this.scrapeEconomicTimes()
            ]);

            this.newsCache = [...mcNews, ...etNews]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 15);

            this.lastUpdated = new Date();
            console.log(`[News] Fetched ${this.newsCache.length} articles at ${this.lastUpdated.toLocaleTimeString()}`);

            return this.newsCache;
        } catch (error) {
            console.error('News fetch error:', error);
            return this.newsCache; // Return cached news on error
        }
    }

    getNews() {
        return this.newsCache;
    }

    getLastUpdated() {
        return this.lastUpdated;
    }
}

module.exports = new NewsScraper();
