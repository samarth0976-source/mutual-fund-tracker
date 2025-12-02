import axios from 'axios';
import fs from 'fs';

async function fetchHoldings() {
    try {
        const response = await axios.get('http://localhost:3000/api/holdings?name=Quant%20Small%20Cap', { timeout: 60000 });
        fs.writeFileSync('clean_debug.json', JSON.stringify(response.data, null, 2));
        console.log("Wrote clean_debug.json");
    } catch (error) {
        console.error(error);
    }
}

fetchHoldings();
