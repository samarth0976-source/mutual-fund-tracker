import 'dotenv/config';
import mongoose from 'mongoose';
import readline from 'readline';
import bcrypt from 'bcrypt';
import User from './models/User.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is missing in .env file");
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error.message);
        process.exit(1);
    }
};

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const listUsers = async () => {
    const users = await User.find({});
    console.log('\n--- User List ---');
    if (users.length === 0) {
        console.log("No users found.");
    } else {
        console.table(users.map(u => ({
            ID: u._id.toString(),
            Username: u.username,
            Email: u.email,
            Pro: u.isPro ? '✅' : '❌',
            Expiry: u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : 'N/A'
        })));
    }
    console.log('-----------------\n');
};

const addUser = async () => {
    const username = await question("Enter Username: ");
    const email = await question("Enter Email: ");
    const password = await question("Enter Password: ");
    const isProInput = await question("Is Pro? (y/n): ");
    const isPro = isProInput.toLowerCase() === 'y';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            isPro,
            subscriptionExpiry: isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null // 30 days default
        });
        await newUser.save();
        console.log(`✅ User ${username} added successfully!`);
    } catch (error) {
        console.error("❌ Error adding user:", error.message);
    }
};

const togglePro = async () => {
    const email = await question("Enter Email of user to toggle Pro status: ");
    const user = await User.findOne({ email });

    if (!user) {
        console.log("❌ User not found.");
        return;
    }

    if (user.isPro) {
        user.isPro = false;
        user.subscriptionExpiry = null;
        console.log(`🔻 Removed Pro status from ${user.username}`);
    } else {
        user.isPro = true;
        // Set expiry to 1 year from now
        user.subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        console.log(`⭐ Upgraded ${user.username} to Pro (Expiry: 1 year)`);
    }

    await user.save();
};

const deleteUser = async () => {
    const email = await question("Enter Email of user to DELETE: ");
    const confirm = await question(`Are you sure you want to delete ${email}? (yes/no): `);

    if (confirm.toLowerCase() === 'yes') {
        const result = await User.deleteOne({ email });
        if (result.deletedCount > 0) {
            console.log(`🗑️  User ${email} deleted.`);
        } else {
            console.log("❌ User not found.");
        }
    } else {
        console.log("Cancelled.");
    }
};

const main = async () => {
    await connectDB();

    while (true) {
        console.log("\n1. List Users");
        console.log("2. Add User");
        console.log("3. Toggle Pro Status");
        console.log("4. Delete User");
        console.log("5. Exit");

        const choice = await question("Choose an option: ");

        switch (choice) {
            case '1': await listUsers(); break;
            case '2': await addUser(); break;
            case '3': await togglePro(); break;
            case '4': await deleteUser(); break;
            case '5':
                console.log("Bye!");
                await mongoose.disconnect();
                process.exit(0);
            default: console.log("Invalid option.");
        }
    }
};

main();
