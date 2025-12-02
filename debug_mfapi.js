import axios from 'axios';

async function testMFAPI() {
    const schemeCode = "120828"; // Quant Small Cap Fund Direct Growth
    const url = `https://api.mfapi.in/mf/${schemeCode}`;

    console.log(`Testing URL: ${url}`);
    try {
        const response = await axios.get(url);
        console.log("Status:", response.status);
        if (response.data) {
            console.log("Keys:", Object.keys(response.data));
            console.log("Meta:", JSON.stringify(response.data.meta, null, 2));
            if (response.data.data) {
                console.log(`Data length: ${response.data.data.length}`);
            }
        }
    } catch (e) {
        console.log("Failed:", e.message);
    }
}

testMFAPI();
