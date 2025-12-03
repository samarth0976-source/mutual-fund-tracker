import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, 'users.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const readUsers = async () => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeUsers = async (users) => {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
};

const listUsers = async () => {
    const users = await readUsers();
    console.clear();
    console.log('\n=== USER LIST ===');
    if (users.length === 0) {
        console.log('No users found.');
    } else {
        const tableData = users.map(u => ({
            Username: u.username,
            Email: u.email,
            'Is Pro?': u.isPro ? '✅ YES' : '❌ NO',
            'Expiry': u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : 'N/A'
        }));
        console.table(tableData);
    }
    console.log('=================\n');
};

const changePassword = async () => {
    const users = await readUsers();
    const username = await question('Enter username to change password: ');

    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        console.log(`❌ User '${username}' not found.`);
        return;
    }

    const newPassword = await question(`Enter new password for ${username}: `);
    if (!newPassword) {
        console.log('❌ Password cannot be empty.');
        return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedPassword;

    await writeUsers(users);
    console.log(`✅ Password updated for '${username}'!`);
};

const toggleProStatus = async () => {
    const users = await readUsers();
    const username = await question('Enter username to toggle Pro status: ');

    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        console.log(`❌ User '${username}' not found.`);
        return;
    }

    const user = users[userIndex];
    const isNowPro = !user.isPro;

    users[userIndex].isPro = isNowPro;

    if (isNowPro) {
        // Set expiry to 1 year from now by default
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        users[userIndex].subscriptionExpiry = expiry.toISOString();
        console.log(`✅ '${username}' is now PRO (Expires: ${expiry.toLocaleDateString()})`);
    } else {
        users[userIndex].subscriptionExpiry = null;
        console.log(`✅ '${username}' is now FREE`);
    }

    await writeUsers(users);
};

const pushToGithub = async () => {
    try {
        console.log('\n🔄 Staging users.json...');
        await execAsync('git add users.json');

        console.log('📦 Committing changes...');
        await execAsync('git commit -m "chore: update users via CLI tool"');

        console.log('🚀 Pushing to GitHub...');
        await execAsync('git push origin main');

        console.log('\n✅ Successfully pushed! The server will redeploy with new user data in a few minutes.');
    } catch (error) {
        console.error('\n❌ Git Error:', error.message);
        if (error.message.includes('nothing to commit')) {
            console.log('  (This means there were no changes to save)');
        }
    }
};

const main = async () => {
    while (true) {
        console.log('\n--- User Management Menu ---');
        console.log('1. List Users');
        console.log('2. Change User Password');
        console.log('3. Toggle Pro/Free Status');
        console.log('4. Save & Push to GitHub (Deploy)');
        console.log('5. Exit');

        const choice = await question('\nEnter choice (1-5): ');

        try {
            switch (choice) {
                case '1':
                    await listUsers();
                    break;
                case '2':
                    await changePassword();
                    break;
                case '3':
                    await toggleProStatus();
                    break;
                case '4':
                    await pushToGithub();
                    break;
                case '5':
                    console.log('Goodbye!');
                    rl.close();
                    return;
                default:
                    console.log('Invalid choice.');
            }
        } catch (error) {
            console.error('An error occurred:', error.message);
        }
    }
};

main();
