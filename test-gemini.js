import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    if (!GEMINI_API_KEY) {
        console.log('❌ No GEMINI_API_KEY found in .env');
        return;
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    try {
        console.log('🔄 Fetching available models...');
        // For v1beta, we might need to use the model endpoint directly or just try generating with common names
        // The SDK doesn't always expose listModels easily in all versions, but let's try a direct generation test

        const modelsToTest = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-1.5-pro'];

        for (const modelName of modelsToTest) {
            try {
                console.log(`Testing model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hello');
                const response = await result.response;
                console.log(`✅ ${modelName} is WORKING!`);
                return; // Found a working one
            } catch (error) {
                console.log(`❌ ${modelName} failed: ${error.message}`);
            }
        }

        console.log('❌ All common models failed.');
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
