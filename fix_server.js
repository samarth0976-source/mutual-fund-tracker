const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Find and replace the user endpoint
const oldEndpoint = `app.get('/api/auth/user', authenticateToken, async (req, res) => {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ 
        user: { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            isPro: user.isPro || false 
        } 
    });
});`;

const newEndpoint = `app.get('/api/auth/user', authenticateToken, async (req, res) => {
    const users = await readUsers();
    let user = users.find(u => u.id === req.user.id);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check and update subscription status
    user = await checkAndUpdateSubscription(user);

    // Calculate days remaining if Pro
    let daysRemaining = null;
    let isGracePeriod = false;
    
    if (user.isPro && user.subscriptionExpiry) {
        const now = new Date();
        const expiryDate = new Date(user.subscriptionExpiry);
        const diffTime = expiryDate - now;
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Check if in grace period (0 or negative days but still Pro)
        if (daysRemaining <= 0) {
            isGracePeriod = true;
            daysRemaining = 0;
        }
    }

    res.json({ 
        user: { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            isPro: user.isPro || false,
            subscriptionExpiry: user.subscriptionExpiry || null,
            daysRemaining,
            isGracePeriod
        } 
    });
});`;

// Replace with proper line ending handling
content = content.replace(oldEndpoint.replace(/\n/g, '\r\n'), newEndpoint.replace(/\n/g, '\r\n'));

fs.writeFileSync(serverPath, content);
console.log('Server.js updated successfully!');
