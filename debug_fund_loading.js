import axios from 'axios';

async function testMFAPI() {
    console.log("1. Testing mfapi.in...");
    try {
        const response = await axios.get("https://api.mfapi.in/mf", { timeout: 10000 });
        console.log(`✅ MFAPI responded with ${response.data.length} funds`);

        // Test filtering
        const specificFunds = [
            "Quant Small Cap Fund",
            "Nippon India Small Cap Fund",
            "ICICI Prudential Bluechip",
            "HDFC Mid-Cap Opportunities Fund",
            "SBI Small Cap Fund",
            "Axis Bluechip Fund",
            "Parag Parikh Flexi Cap Fund"
        ];

        const filtered = response.data.filter(f =>
            specificFunds.some(sf => f.schemeName.includes(sf))
        );

        console.log(`\n2. Filtered Results (${filtered.length} funds):`);
        filtered.forEach(f => {
            console.log(`   - ${f.schemeName} (Code: ${f.schemeCode})`);
        });

    } catch (e) {
        console.log("❌ MFAPI Error:", e.message);
    }
}

testMFAPI();
