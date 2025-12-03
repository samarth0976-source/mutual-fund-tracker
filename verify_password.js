import bcrypt from 'bcrypt';
import fs from 'fs/promises';

const verifyUser = async (username, password) => {
    try {
        const data = await fs.readFile('users.json', 'utf-8');
        const users = JSON.parse(data);

        const user = users.find(u => u.username === username);

        if (!user) {
            console.log(`User '${username}' not found.`);
            return;
        }

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            console.log(`✅ Success! Password is correct for '${username}'.`);
        } else {
            console.log(`❌ Invalid password for '${username}'.`);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
};

// Usage: node verify_password.js <username> <password>
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log("Usage: node verify_password.js <username> <password>");
} else {
    verifyUser(args[0], args[1]);
}
