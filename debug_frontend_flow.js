import axios from 'axios';

async function testFlow() {
    const schemeCode = "120586";
    console.log(`1. Fetching MFAPI details for ${schemeCode}...`);

    try {
        const mfResponse = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`);
        const data = mfResponse.data;
        const rawName = data.meta.scheme_name;
        console.log(`   Name from MFAPI: "${rawName}"`);

        // Force exact name for testing
        const cleanName = "ICICI Prudential Bluechip Fund";
        console.log(`2. Cleaned Name (Forced): "${cleanName}"`);

        console.log(`3. Calling Proxy with cleaned name...`);
        const proxyUrl = `http://localhost:3000/api/holdings?name=${encodeURIComponent(cleanName)}`;
        console.log(`   URL: ${proxyUrl}`);

        const proxyResponse = await axios.get(proxyUrl);
        if (proxyResponse.data) {
            console.log(`4. Proxy Response:`);
            console.log(`   Fund: ${proxyResponse.data.meta?.fund || 'N/A'}`);
            console.log(`   Holdings Count: ${proxyResponse.data.holdings?.length || 0}`);
            if (proxyResponse.data.holdings?.length > 0) {
                console.log(`   Top Holding: ${proxyResponse.data.holdings[0].name}`);
            }
        }

    } catch (e) {
        console.log("Error:", e.message);
        if (e.response) {
            console.log("Response Data:", e.response.data);
        }
    }
}

testFlow();
