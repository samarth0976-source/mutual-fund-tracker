import axios from 'axios';

async function testMFAPI() {
    const schemeCode = "102987";
    const url = `https://api.mfapi.in/mf/${schemeCode}`;

    console.log(`Testing URL: ${url}`);
    try {
        const response = await axios.get(url);
        if (response.data) {
            console.log("Meta:", JSON.stringify(response.data.meta, null, 2));
            // Check last NAV date
            if (response.data.data && response.data.data.length > 0) {
                console.log("Latest NAV:", response.data.data[0]);
            }
        }
    } catch (e) {
        console.log("Failed:", e.message);
    }
}

testMFAPI();
