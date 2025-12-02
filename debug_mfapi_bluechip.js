import axios from 'axios';

async function testMFAPI() {
    const schemeCode = "120586";
    const url = `https://api.mfapi.in/mf/${schemeCode}`;

    console.log(`Testing URL: ${url}`);
    try {
        const response = await axios.get(url);
        if (response.data) {
            console.log("Meta:", JSON.stringify(response.data.meta, null, 2));
        }
    } catch (e) {
        console.log("Failed:", e.message);
    }
}

testMFAPI();
