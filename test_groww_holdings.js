// Test Groww API for holdings data using native fetch
async function testGrowwHoldings() {
    const fundName = 'ICICI Prudential Smallcap Fund';

    // Generate slug
    const baseSlug = fundName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const slug = `${baseSlug}-direct-growth`;
    console.log('Testing slug:', slug);

    // Try Groww's search API first to get the correct search_id
    const searchUrl = `https://groww.in/v1/api/search/v1/entity?q=${encodeURIComponent(fundName + ' Direct Growth')}&page=0&size=10&entity_type=scheme`;
    console.log('\n1. Trying Search API:', searchUrl);

    try {
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            console.log('Search API failed with status:', searchResponse.status);
            return;
        }

        const searchData = await searchResponse.json();
        console.log('Search response content length:', searchData.content?.length || 0);

        if (searchData.content && searchData.content.length > 0) {
            const fund = searchData.content[0];
            console.log('\n✅ Found fund:', fund.title || fund.name);
            console.log('Fund data:', JSON.stringify(fund, null, 2));

            // Try to get scheme data using search_id
            if (fund.search_id) {
                console.log('\n2. Trying scheme data API with search_id:', fund.search_id);

                const schemeUrl = `https://groww.in/v1/api/data/mf/web/v4/scheme/search/${fund.search_id}`;
                console.log('Scheme URL:', schemeUrl);

                const schemeResponse = await fetch(schemeUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Origin': 'https://groww.in',
                        'Referer': 'https://groww.in/'
                    }
                });

                if (schemeResponse.ok) {
                    const schemeData = await schemeResponse.json();
                    console.log('\nScheme data keys:', Object.keys(schemeData));

                    if (schemeData.holdings) {
                        console.log('\n✅ FOUND HOLDINGS:', schemeData.holdings.length, 'items');
                        console.log('First 3 holdings:', JSON.stringify(schemeData.holdings.slice(0, 3), null, 2));
                    } else {
                        console.log('\n❌ No holdings in scheme data');
                    }
                } else {
                    console.log('Scheme API failed:', schemeResponse.status);
                }
            }
        } else {
            console.log('\n❌ No funds found in search');
        }
    } catch (error) {
        console.log('\n❌ Error:', error.message);
    }
}

testGrowwHoldings();
