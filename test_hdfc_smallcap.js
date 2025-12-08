// Test HDFC Small Cap Fund holdings via Groww API - improved search
async function testHdfcSmallCap() {
    // Try different search variations
    const searchVariations = [
        'HDFC Small Cap Fund Direct Plan Growth',
        'HDFC Small Cap Direct Growth',
        'HDFC Smallcap Direct Growth'
    ];

    for (const fundName of searchVariations) {
        const searchQuery = encodeURIComponent(fundName);
        const searchUrl = `https://groww.in/v1/api/search/v1/entity?q=${searchQuery}&page=0&size=10&entity_type=scheme`;

        console.log('\n🔍 Searching for:', fundName);

        try {
            const searchResponse = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            const searchData = await searchResponse.json();

            if (searchData.content && searchData.content.length > 0) {
                // Find HDFC fund
                const hdfcFund = searchData.content.find(f =>
                    f.title?.toLowerCase().includes('hdfc') &&
                    f.title?.toLowerCase().includes('small')
                );

                if (hdfcFund) {
                    console.log('✅ Found HDFC fund:', hdfcFund.title);
                    console.log('Search ID:', hdfcFund.search_id);

                    // Fetch holdings
                    const schemeUrl = `https://groww.in/v1/api/data/mf/web/v4/scheme/search/${hdfcFund.search_id}`;
                    const schemeResponse = await fetch(schemeUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json'
                        }
                    });

                    if (schemeResponse.ok) {
                        const schemeData = await schemeResponse.json();
                        console.log('Holdings count:', schemeData.holdings?.length || 0);

                        if (schemeData.holdings && schemeData.holdings.length > 0) {
                            console.log('First 3 holdings:', schemeData.holdings.slice(0, 3).map(h => h.company_name));
                        }
                    }
                    return;
                } else {
                    console.log('All results (looking for HDFC):');
                    searchData.content.forEach(f => console.log('  -', f.title));
                }
            }
        } catch (error) {
            console.log('Error:', error.message);
        }
    }
}

testHdfcSmallCap();
