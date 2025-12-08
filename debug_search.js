// Debug: check HDFC Small Cap Fund search results in detail
async function debugSearch() {
    const searchQuery = encodeURIComponent('HDFC Small Cap Fund Direct Growth');
    const searchUrl = `https://groww.in/v1/api/search/v1/entity?q=${searchQuery}&page=0&size=10&entity_type=scheme`;

    const response = await fetch(searchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
    });
    const data = await response.json();

    console.log('Search results for HDFC Small Cap Fund:\n');
    data.content.slice(0, 5).forEach((f, i) => {
        const title = f.title || 'no title';
        const titleLower = title.toLowerCase();
        console.log(`${i + 1}. "${title}"`);
        console.log(`   search_id: ${f.search_id}`);
        console.log(`   Has 'direct': ${titleLower.includes('direct')}`);
        console.log(`   Has 'small': ${titleLower.includes('small')}`);
        console.log(`   Has 'hdfc': ${titleLower.includes('hdfc')}`);
        console.log('');
    });
}

debugSearch();
