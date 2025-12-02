import axios from 'axios';

async function fetchList() {
    const url = "https://api.mfapi.in/mf";
    console.log(`Fetching list from: ${url}`);
    try {
        const response = await axios.get(url);
        if (response.data) {
            console.log(`Total funds: ${response.data.length}`);

            const keywords = ["Bluechip", "Small Cap", "Mid Cap", "Flexi Cap"];
            const icici = response.data.filter(f => f.schemeName.includes("ICICI") && f.schemeName.includes("Bluechip") && f.schemeName.includes("Direct") && f.schemeName.includes("Growth"));

            console.log("\n--- ICICI Bluechip Candidates ---");
            icici.forEach(f => console.log(`"${f.schemeName}" (Code: ${f.schemeCode})`));

            const quant = response.data.filter(f => f.schemeName.includes("Quant") && f.schemeName.includes("Small Cap") && f.schemeName.includes("Direct") && f.schemeName.includes("Growth"));
            console.log("\n--- Quant Candidates ---");
            quant.forEach(f => console.log(`"${f.schemeName}" (Code: ${f.schemeCode})`));

        }
    } catch (e) {
        console.log("Failed:", e.message);
    }
}

fetchList();
