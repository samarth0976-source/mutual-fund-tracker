import axios from 'axios';
import 'dotenv/config';

const API_KEY = process.env.GEMINI_API_KEY;

async function debugGemini() {
    if (!API_KEY) {
        console.error('❌ No GEMINI_API_KEY found in .env');
        return;
    }

    console.log('🔑 Testing API Key with direct REST call...');
    console.log('📡 Endpoint: https://generativelanguage.googleapis.com/v1beta/models');

    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );

        console.log('\n✅ API Call Successful! Available Models:');
        const models = response.data.models;

        const generateModels = models.filter(m => m.supportedGenerationMethods.includes('generateContent'));

        generateModels.forEach(m => {
            console.log(`- ${m.name.replace('models/', '')}`);
        });

        if (generateModels.length === 0) {
            console.log('⚠️ No models support generateContent. This is unexpected.');
        } else {
            console.log('\n💡 Recommendation: Use one of the model names above in server.js');
        }

    } catch (error) {
        console.error('\n❌ API Call Failed!');
        if (error.response) {
            console.error(`Status: ${error.response.status} ${error.response.statusText}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 400) {
                console.log('👉 Check if "Generative Language API" is enabled in Google Cloud Console.');
            }
        } else {
            console.error('Error:', error.message);
        }
    }
}

debugGemini();
