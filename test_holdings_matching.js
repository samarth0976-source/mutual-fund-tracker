// Final comprehensive test with all improvements
async function testHoldingsMatching() {
    const testFunds = [
        { name: 'HDFC Small Cap Fund - Direct Plan - Growth Option', expect: 'HDFC Small Cap' },
        { name: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth', expect: 'ICICI*Bluechip' },
        { name: 'SBI Large Cap Fund - Direct Plan - Growth', expect: 'SBI Large' },
        { name: 'Axis Midcap Fund - Direct Plan - Growth Option', expect: 'Axis Midcap' },
        { name: 'Mirae Asset Large Cap Fund - Direct Plan - Growth', expect: 'Mirae*Large' },
        { name: 'Quant Small Cap Fund - Direct Plan - Growth', expect: 'Quant Small' },
        { name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', expect: 'Parag Parikh Flexi' },
        { name: 'HDFC Flexi Cap Fund - Direct Plan - Growth Option', expect: 'HDFC Flexi' },
        { name: 'Nippon India Small Cap Fund - Direct Plan - Growth Plan', expect: 'Nippon*Small' },
        { name: 'DSP Midcap Fund - Direct Plan - Growth', expect: 'DSP Midcap' },
        { name: 'Kotak Small Cap Fund - Direct Plan - Growth Option', expect: 'Kotak Small' },
        { name: 'Tata Large Cap Fund Direct Plan - Growth', expect: 'Tata Large' }
    ];

    console.log('Testing final holdings matching...\n');
    let passed = 0;
    let failed = 0;

    for (const fund of testFunds) {
        const cleanName = fund.name
            .replace(/-?\s*Direct\s*(Plan)?\s*-?/gi, '')
            .replace(/-?\s*Growth\s*(Option|Plan)?\s*-?/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        const originalNameLower = fund.name.toLowerCase();

        // Extract fund type keywords
        const fundTypeKeywords = [];
        if (originalNameLower.includes('small') && originalNameLower.includes('cap')) fundTypeKeywords.push('small');
        if (originalNameLower.includes('mid') && originalNameLower.includes('cap')) fundTypeKeywords.push('mid');
        if (originalNameLower.includes('large') && originalNameLower.includes('cap')) fundTypeKeywords.push('large');
        if (originalNameLower.includes('bluechip')) fundTypeKeywords.push('bluechip');
        if (originalNameLower.includes('flexi')) fundTypeKeywords.push('flexi');
        if (originalNameLower.includes('index')) fundTypeKeywords.push('index');

        // Extract AMC
        const amcPatterns = ['hdfc', 'icici prudential', 'icici', 'sbi', 'axis', 'kotak', 'nippon india', 'nippon', 'tata', 'dsp',
            'mirae asset', 'mirae', 'aditya birla', 'uti', 'quant', 'parag parikh', 'ppfas'];
        let amcName = '';
        for (const amc of amcPatterns) {
            if (originalNameLower.includes(amc)) { amcName = amc; break; }
        }

        const searchQuery = encodeURIComponent(cleanName + ' Direct Growth');
        const searchUrl = `https://groww.in/v1/api/search/v1/entity?q=${searchQuery}&page=0&size=15&entity_type=scheme`;

        try {
            const response = await fetch(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
            });
            const data = await response.json();

            if (data.content && data.content.length > 0) {
                let bestMatch = null;
                let bestScore = 0;

                for (const f of data.content) {
                    const title = f.title?.toLowerCase() || '';
                    const searchId = f.search_id?.toLowerCase() || '';
                    const combined = title + ' ' + searchId;
                    let score = 0, typeMatched = 0;

                    if (!combined.includes('direct')) continue;

                    if (amcName) {
                        const needsWordBoundary = ['quant', 'jm', 'uti', 'dsp', 'sbi', 'lic'].includes(amcName);
                        if (needsWordBoundary) {
                            if (!new RegExp(`\\b${amcName}\\b`, 'i').test(combined)) continue;
                        } else {
                            if (!combined.includes(amcName)) continue;
                        }
                    }
                    score += 10;

                    for (const kw of fundTypeKeywords) {
                        if (combined.includes(kw)) { score += 5; typeMatched++; }
                    }
                    if (fundTypeKeywords.length > 0 && typeMatched === 0) continue;

                    if (combined.includes('growth')) score += 3;
                    if (combined.includes('idcw') || combined.includes('dividend')) score -= 5;
                    if (combined.includes('index') && !fundTypeKeywords.includes('index')) score -= 10;
                    if (combined.includes('large') && !originalNameLower.includes('large')) score -= 8;
                    if (combined.includes('fof') && !originalNameLower.includes('fof')) score -= 5;

                    if (score > bestScore) { bestScore = score; bestMatch = f; }
                }

                if (bestMatch) {
                    const matchTitle = bestMatch.title;
                    const expectParts = fund.expect.split('*');
                    const matchLower = matchTitle.toLowerCase();
                    const isCorrect = expectParts.every(p => matchLower.includes(p.toLowerCase()));

                    if (isCorrect) {
                        console.log(`✅ ${fund.name.substring(0, 40)}... → ${matchTitle} (score:${bestScore})`);
                        passed++;
                    } else {
                        console.log(`⚠️ ${fund.name.substring(0, 40)}... → ${matchTitle} (expected: ${fund.expect})`);
                        failed++;
                    }
                } else {
                    console.log(`❌ ${fund.name.substring(0, 40)}... → No match found`);
                    failed++;
                }
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
}

testHoldingsMatching();
