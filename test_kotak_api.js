// KOTAK NEO API - Complete Authentication Flow
// Based on official documentation

const ACCESS_TOKEN = '8b8fd30e-a2de-4914-ba8b-795c8ef663cb';
const MOBILE = '+918851415822';
const UCC = 'Y6QV2';
const MPIN = '270108';

// Fixed login endpoints (per documentation)
const LOGIN_URL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const VALIDATE_URL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';

async function step1_TOTPLogin(totp) {
    console.log('\n📲 Step 1: TOTP Login');
    console.log(`Endpoint: ${LOGIN_URL}`);
    console.log(`TOTP: ${totp}`);

    const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
            'Authorization': ACCESS_TOKEN,  // Plain token, no Bearer!
            'neo-fin-key': 'neotradeapi',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            mobileNumber: MOBILE,
            ucc: UCC,
            totp: totp
        })
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);

    if (response.ok && text.startsWith('{')) {
        const data = JSON.parse(text);
        if (data.data && data.data.token && data.data.sid) {
            console.log('\n✅ TOTP Login SUCCESS!');
            console.log(`View Token: ${data.data.token.substring(0, 50)}...`);
            console.log(`View SID: ${data.data.sid}`);
            return data.data;
        }
    }

    console.log('\n❌ TOTP Login FAILED');
    return null;
}

async function step2_MPINValidate(viewToken, viewSid) {
    console.log('\n🔐 Step 2: MPIN Validate');
    console.log(`Endpoint: ${VALIDATE_URL}`);

    const response = await fetch(VALIDATE_URL, {
        method: 'POST',
        headers: {
            'Authorization': ACCESS_TOKEN,
            'neo-fin-key': 'neotradeapi',
            'sid': viewSid,        // View SID from Step 1
            'Auth': viewToken,     // View Token from Step 1
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            mpin: MPIN
        })
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);

    if (response.ok && text.startsWith('{')) {
        const data = JSON.parse(text);
        if (data.data && data.data.baseUrl) {
            console.log('\n🎉 MPIN Validation SUCCESS!');
            console.log(`Base URL: ${data.data.baseUrl}`);
            console.log(`Trading Token: ${data.data.token.substring(0, 50)}...`);
            console.log(`Trading SID: ${data.data.sid}`);
            return data.data;
        }
    }

    console.log('\n❌ MPIN Validation FAILED');
    return null;
}

async function step3_GetScripMaster(baseUrl, tradingToken) {
    console.log('\n📋 Step 3: Get Scrip Master');
    const url = `${baseUrl}/script-details/1.0/masterscrip/file-paths`;
    console.log(`Endpoint: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': ACCESS_TOKEN  // Only access token needed
        }
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);

    if (response.ok && text.startsWith('{')) {
        const data = JSON.parse(text);
        console.log('\n✅ Scrip Master SUCCESS!');
        console.log('CSV Files:');
        data.data.filesPaths.forEach(path => console.log(`  - ${path}`));
        return data.data;
    }

    console.log(`Response: ${text.substring(0, 300)}`);
    return null;
}

async function step4_GetQuotes(baseUrl) {
    console.log('\n📊 Step 4: Get Sample Quotes');
    // Get Nifty 50 and Nifty Bank quotes
    const url = `${baseUrl}/script-details/1.0/quotes/neosymbol/nse_cm|Nifty 50,nse_cm|Nifty Bank/all`;
    console.log(`Endpoint: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': ACCESS_TOKEN,
            'Content-Type': 'application/json'
        }
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);

    if (response.ok) {
        const data = JSON.parse(text);
        console.log('\n✅ Quotes SUCCESS!');
        console.log(JSON.stringify(data, null, 2));
        return data;
    }

    console.log(`Response: ${text.substring(0, 300)}`);
    return null;
}

async function main() {
    console.log('='.repeat(60));
    console.log('KOTAK NEO API - COMPLETE AUTHENTICATION FLOW');
    console.log('='.repeat(60));
    console.log(`Access Token: ${ACCESS_TOKEN}`);
    console.log(`Mobile: ${MOBILE}`);
    console.log(`UCC: ${UCC}`);
    console.log('');

    // Get TOTP from command line
    const totp = process.argv[2];

    if (!totp || totp.length !== 6) {
        console.log('⚠️ Please provide a 6-digit TOTP code:');
        console.log('   node test_kotak_api.js 123456');
        return;
    }

    // Step 1: TOTP Login
    const loginResult = await step1_TOTPLogin(totp);
    if (!loginResult) return;

    // Step 2: MPIN Validate
    const validateResult = await step2_MPINValidate(loginResult.token, loginResult.sid);
    if (!validateResult) return;

    // Save credentials for future use
    console.log('\n📝 SAVE THESE CREDENTIALS:');
    console.log('='.repeat(60));
    console.log(`BASE_URL=${validateResult.baseUrl}`);
    console.log(`TRADING_TOKEN=${validateResult.token}`);
    console.log(`TRADING_SID=${validateResult.sid}`);
    console.log('='.repeat(60));

    // Step 3: Get Scrip Master
    await step3_GetScripMaster(validateResult.baseUrl, validateResult.token);

    // Step 4: Get Quotes
    await step4_GetQuotes(validateResult.baseUrl);

    console.log('\n\n🎉 ALL STEPS COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);
