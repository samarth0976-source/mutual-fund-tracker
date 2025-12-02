import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function scrapeStock(slug) {
    try {
        const url = `https://groww.in/stocks/${slug}`;
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;

        // Search for "1Y" or "Return" in HTML
        const regex = /.{0,50}1Y.{0,50}/g;
        const matches = html.match(regex);
        if (matches) {
            console.log("Found '1Y' matches:");
            matches.slice(0, 10).forEach(m => console.log(m));
        } else {
            console.log("'1Y' not found in HTML");
        }

        const regex2 = /.{0,50}Return.{0,50}/g;
        const matches2 = html.match(regex2);
        if (matches2) {
            console.log("Found 'Return' matches:");
            matches2.slice(0, 10).forEach(m => console.log(m));
        }

        // Also check for "performance"
        const regex3 = /.{0,50}performance.{0,50}/g;
        const matches3 = html.match(regex3);
        if (matches3) {
            console.log("Found 'performance' matches:");
            matches3.slice(0, 10).forEach(m => console.log(m));
        }

    } catch (e) {
        console.error(e.message);
    }
}

scrapeStock('reliance-industries-ltd');
