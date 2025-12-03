import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

const envContent = `# JWT Secret
JWT_SECRET=your-secret-key-change-this-in-production

# Cashfree Payment Gateway
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET=your_cashfree_secret

# Server Port
PORT=3000

# Frontend API URL
VITE_API_URL=http://localhost:3000

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://fundtracker:Samarth09@cluster0.ol4rfqi.mongodb.net/fundtracker?retryWrites=true&w=majority&appName=Cluster0

# Google Gemini AI API Key
GEMINI_API_KEY=AIzaSyCwBriI-IWSTxOiQRL_KSJdWQu3hQ_m3bk
`;

try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Restart your backend server (Ctrl+C then: node server.js)');
    console.log('2. Look for these messages in the console:');
    console.log('   ✅ Connected to MongoDB');
    console.log('   ✅ Gemini AI initialized');
    console.log('\n3. Test locally:');
    console.log('   - Create a test user via signup');
    console.log('   - Check MongoDB Atlas dashboard - user should appear');
    console.log('   - Open any mutual fund');
    console.log('   - Click "Analyze with AI" button');
    console.log('\n4. Deploy to production:');
    console.log('   - Add these same environment variables to your hosting platform');
    console.log('   - Redeploy your application');
} catch (error) {
    console.error('❌ Error:', error.message);
}
