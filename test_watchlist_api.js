// Test watchlist API directly
const BACKEND_URL = 'https://mutual-fund-tracker-vd6q.onrender.com';

async function testWatchlistAPI() {
    // First login to get token
    console.log('Testing Watchlist API...\n');

    try {
        // Test creating a watchlist (you need to replace with a valid token)
        const token = 'YOUR_TOKEN_HERE'; // Replace with actual token from localStorage

        console.log('1. Testing GET /api/watchlist...');
        const getResponse = await fetch(`${BACKEND_URL}/api/watchlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getData = await getResponse.json();
        console.log('GET Status:', getResponse.status);
        console.log('GET Response:', JSON.stringify(getData, null, 2));

        console.log('\n2. Testing POST /api/watchlist...');
        const postResponse = await fetch(`${BACKEND_URL}/api/watchlist`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'Test Watchlist ' + Date.now() })
        });
        const postData = await postResponse.json();
        console.log('POST Status:', postResponse.status);
        console.log('POST Response:', JSON.stringify(postData, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testWatchlistAPI();
