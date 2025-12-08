// Debug: Check what MFAPI fund details look like
async function testMfapiDetails() {
    const response = await fetch('https://api.mfapi.in/mf/119598');
    const data = await response.json();

    console.log('Meta:', data.meta);
    console.log('\nFirst 3 data entries:');
    data.data.slice(0, 3).forEach((item, i) => {
        console.log(`${i + 1}.`, item);
    });
}

testMfapiDetails();
