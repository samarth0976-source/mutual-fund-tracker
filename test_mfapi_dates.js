// Test MFAPI date format
async function testMfapiDates() {
    const response = await fetch('https://api.mfapi.in/mf/119598'); // HDFC Small Cap
    const data = await response.json();

    console.log('Fund Name:', data.meta?.scheme_name);
    console.log('\nFirst 5 NAV entries:');
    data.data.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. Date: "${item.date}" | NAV: ${item.nav}`);
        console.log(`   Parsed as Date: ${new Date(item.date)}`);
    });

    console.log('\nLast 5 NAV entries (oldest):');
    data.data.slice(-5).forEach((item, i) => {
        console.log(`${i + 1}. Date: "${item.date}" | NAV: ${item.nav}`);
    });
}

testMfapiDates();
