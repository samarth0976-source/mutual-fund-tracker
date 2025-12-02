import axios from 'axios';

const API_KEY = 'eyJraWQiOiJaTUtjVXciLCJhbGciOiJFUzI1NiJ9.eyJleHAiOjI1NTMwNzIzMjMsImlhdCI6MTc2NDY3MjMyMywibmJmIjoxNzY0NjcyMzIzLCJzdWIiOiJ7XCJ0b2tlblJlZklkXCI6XCI3ZTFjZjVhNC0wNGNlLTQ0NTAtYTY5OS0yNGEyZjM5ZTMzMThcIixcInZlbmRvckludGVncmF0aW9uS2V5XCI6XCJlMzFmZjIzYjA4NmI0MDZjODg3NGIyZjZkODQ5NTMxM1wiLFwidXNlckFjY291bnRJZFwiOlwiNDBhNGJmYWQtMGZlNS00MTM3LTkzYzEtZTY0YmY0MTE1Y2RmXCIsXCJkZXZpY2VJZFwiOlwiYmYyMDljMDYtMTM2MS01NGE4LTg1NGMtZmQ4NzY3NThkNDJmXCIsXCJzZXNzaW9uSWRcIjpcImI4NmVhNTUzLTk4ZWYtNDA3Yy04ZmJlLWM2ZWRmZjc2MDJmYlwiLFwiYWRkaXRpb25hbERhdGFcIjpcIno1NC9NZzltdjE2WXdmb0gvS0EwYkgxa3BUdW5iZ3Rzc21mVzhDU0RTdGRSTkczdTlLa2pWZDNoWjU1ZStNZERhWXBOVi9UOUxIRmtQejFFQisybTdRPT1cIixcInJvbGVcIjpcImF1dGgtdG90cFwiLFwic291cmNlSXBBZGRyZXNzXCI6XCIxMDMuODcuNTcuMjQ3LDEwNC4yMy4yMTYuMTgxLDM1LjI0MS4yMy4xMjNcIixcInR3b0ZhRXhwaXJ5VHNcIjoyNTUzMDcyMzIzMDE5fSIsImlzcyI6ImFwZXgtYXV0aC1wcm9kLWFwcCJ9.hTMZ15J7Dqtdj-o9FP1UcIwODDHjsmvS5EhoT9oxsZD8y-4M2lSc5wjvXGJ0KHbr_5DFJBpQHTBq-iJNyniYwg';
const API_SECRET = 'plP-nszCNkI*d)HAo))9zM$VZ59P9zvD';
const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'X-API-KEY': API_SECRET,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

const GROWW_SEARCH_URL = "https://groww.in/v1/api/search/v1/entity?app=false&page=0&q=";

async function discoverMF() {
    const name = "Quant Small Cap Fund";
    console.log(`Searching for: ${name}`);

    try {
        const searchResponse = await axios.get(`${GROWW_SEARCH_URL}${encodeURIComponent(name)}`, { headers: HEADERS });
        if (!searchResponse.data || searchResponse.data.content.length === 0) {
            console.log("Fund not found");
            return;
        }

        const fund = searchResponse.data.content[0];
        console.log("Fund Search Result:", JSON.stringify(fund, null, 2));

        const searchId = fund.search_id;
        const id = fund.id;

        // Potential endpoints to test
        const urls = [
            `https://groww.in/v1/api/data/mutual_fund/v1/schemes/${searchId}`,
            `https://groww.in/v1/api/mutual_fund_data/v1/schemes/${searchId}`,
            `https://groww.in/v1/api/data/mutual_fund/v1/schemes/${id}`,
            `https://groww.in/v1/api/mutual_fund_data/v1/schemes/${id}`,
            `https://groww.in/v1/api/data/mutual_fund/v1/scheme/${searchId}`, // singular
            `https://groww.in/v1/api/mutual_fund_data/v1/scheme/${searchId}` // singular
        ];

        for (const url of urls) {
            console.log(`\nTesting URL: ${url}`);
            try {
                const response = await axios.get(url, { headers: HEADERS });
                console.log("Status:", response.status);
                if (response.data) {
                    const keys = Object.keys(response.data);
                    console.log("Keys:", keys.join(", "));

                    // Check for holdings in various common fields
                    const holdings = response.data.holdings || response.data.portfolio_holdings || response.data.scheme_holdings;
                    if (holdings) {
                        console.log("!!! FOUND HOLDINGS !!!");
                        console.log("Count:", holdings.length);
                        console.log("Sample:", JSON.stringify(holdings[0], null, 2));
                    }
                }
            } catch (e) {
                console.log("Failed:", e.message);
                if (e.response) console.log("Status:", e.response.status);
            }
        }

    } catch (e) {
        console.log("Error:", e.message);
    }
}

discoverMF();
