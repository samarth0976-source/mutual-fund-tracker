// Debug remaining issues
async function debugCases() {
    const testCases = [
        { name: 'ICICI Prudential Bluechip Fund', cleanQuery: 'ICICI Prudential Bluechip Fund Direct Growth' },
        { name: 'Nippon India Small Cap Fund', cleanQuery: 'Nippon India Small Cap Fund Direct Growth' },
        { name: 'DSP Midcap Fund', cleanQuery: 'DSP Midcap Fund Direct Growth' }
    ];

    for (const tc of testCases) {
        console.log(`\n=== ${tc.name} ===`);
        const searchQuery = encodeURIComponent(tc.cleanQuery);
        const searchUrl = `https://groww.in/v1/api/search/v1/entity?q=${searchQuery}&page=0&size=10&entity_type=scheme`;

        try {
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();

            if (data.content && data.content.length > 0) {
                console.log(`Found ${data.content.length} results:`);
                data.content.slice(0, 6).forEach((f, i) => {
                    const titleLower = f.title.toLowerCase();
                    const idLower = f.search_id.toLowerCase();
                    const combined = titleLower + ' ' + idLower;
                    console.log(`${i + 1}. ${f.title}`);
                    console.log(`   id: ${f.search_id}`);
                    console.log(`   has bluechip: ${combined.includes('bluechip')}, has blue: ${combined.includes('blue')}`);
                    console.log(`   has small: ${combined.includes('small')}, has index: ${combined.includes('index')}`);
                });
            }
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
    }
}

debugCases();
