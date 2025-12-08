// Test Groww URL generation
const testFunds = [
    'ICICI Prudential Smallcap Fund',
    'HDFC Mid-Cap Opportunities Fund',
    'Axis Bluechip Fund',
    'SBI Flexi Cap Fund'
];

testFunds.forEach(name => {
    const baseSlug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const slug = `${baseSlug}-direct-growth`;
    console.log('Fund:', name);
    console.log('Generated:', `https://groww.in/mutual-funds/${slug}`);
    console.log('');
});

// Correct URLs on Groww are actually:
console.log('=== EXPECTED GROWW URLS ===');
console.log('ICICI Prudential Smallcap Fund -> https://groww.in/mutual-funds/icici-prudential-smallcap-fund-direct-growth');
console.log('HDFC Mid-Cap Opportunities Fund -> https://groww.in/mutual-funds/hdfc-mid-cap-opportunities-fund-direct-growth');
