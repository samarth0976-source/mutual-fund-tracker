import axios from 'axios';

async function checkSchemes() {
    const codes = ["120586", "152557"];

    for (const code of codes) {
        const url = `https://api.mfapi.in/mf/${code}`;
        console.log(`\nChecking Code: ${code}`);
        try {
            const response = await axios.get(url);
            if (response.data && response.data.meta) {
                console.log("Scheme Name:", response.data.meta.scheme_name);
                console.log("Fund House:", response.data.meta.fund_house);
            } else {
                console.log("No metadata found");
            }
        } catch (e) {
            console.log("Failed:", e.message);
        }
    }
}

checkSchemes();
