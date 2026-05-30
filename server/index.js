const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./utils/db');
const { startScheduler, checkIssues } = require('./services/scheduler');
const { startCleanupJob } = require('./services/cleanup');
const { startPushReceiptVerificationJob } = require('./services/pushNotifications');
const { mergeExpoPushTokens } = require('./utils/expoPushTokens');

dotenv.config();
connectDB();

console.log(`🔐 GitHub token configured: ${process.env.GITHUB_TOKEN ? 'yes' : 'no'}`);

const app = express();
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/repos', require('./routes/repo'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/user/token', require('./routes/token'));
app.use('/api/health', require('./routes/health'));

// Manual Trigger for Debugging
app.post('/api/debug/check', async (req, res) => {
    await checkIssues();
    res.json({ message: 'Check triggered' });
});

// Debug: Check push token registration status
app.get('/api/debug/push-tokens', async (req, res) => {
    try {
        const User = require('./models/User');
        const users = await User.find({}, 'email expoPushTokens expoPushToken deviceInfo notificationsEnabled').limit(10);
        
        const { Expo } = require('expo-server-sdk');
        const status = users.map(u => ({
            email: u.email,
            hasToken: mergeExpoPushTokens(u.expoPushTokens, u.expoPushToken).length > 0,
            tokenCount: mergeExpoPushTokens(u.expoPushTokens, u.expoPushToken).length,
            tokenValid: mergeExpoPushTokens(u.expoPushTokens, u.expoPushToken).some(token => Expo.isExpoPushToken(token)),
            token: mergeExpoPushTokens(u.expoPushTokens, u.expoPushToken)[0] ? mergeExpoPushTokens(u.expoPushTokens, u.expoPushToken)[0].substring(0, 20) + '...' : 'none',
            notificationsEnabled: u.notificationsEnabled,
            device: u.deviceInfo?.platform || 'unknown'
        }));
        
        res.json({
            message: 'Push token status for latest 10 users',
            count: users.length,
            status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🆕 TEST: Send test push notification
app.post('/api/debug/test-push/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const User = require('./models/User');
        const { sendPushNotification } = require('./services/pushNotifications');

        const user = await User.findById(userId).select('email expoPushTokens expoPushToken deviceInfo notificationsEnabled');
        if (!user) return res.status(404).json({ error: 'User not found' });

        console.log(`\n🧪🧪🧪 SENDING TEST NOTIFICATION TO USER: ${userId}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Has Token: ${mergeExpoPushTokens(user.expoPushTokens, user.expoPushToken).length > 0}`);
        console.log(`   Notifications Enabled: ${user.notificationsEnabled}`);
        console.log(`   Device: ${user.deviceInfo?.platform || 'unknown'}\n`);

        const result = await sendPushNotification(userId, {
            _id: 'test-' + Date.now(),
            issueTitle: '🧪 TEST NOTIFICATION',
            issueUrl: 'https://github.com/test/test/issues/1',
            matchedLabels: ['test'],
            repository: {
                owner: 'test',
                name: 'test'
            }
        });

        res.json({ 
            message: 'Test notification sent', 
            result,
            userInfo: {
                email: user.email,
                hasToken: mergeExpoPushTokens(user.expoPushTokens, user.expoPushToken).length > 0,
                tokenCount: mergeExpoPushTokens(user.expoPushTokens, user.expoPushToken).length,
                token: mergeExpoPushTokens(user.expoPushTokens, user.expoPushToken)[0] ? mergeExpoPushTokens(user.expoPushTokens, user.expoPushToken)[0].substring(0, 50) + '...' : null,
                deviceInfo: user.deviceInfo,
                notificationsEnabled: user.notificationsEnabled
            }
        });
    } catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    // 🆕 CLEANUP: Remove orphaned subscriptions on startup
    console.log('🧹 Running cleanup tasks...');
    try {
        const { Subscription } = require('./models/Resources');
        
        const allSubs = await Subscription.find({}).populate('repository');
        const orphanedIds = allSubs
            .filter(sub => !sub.repository)
            .map(sub => sub._id);

        if (orphanedIds.length > 0) {
            const result = await Subscription.deleteMany({ _id: { $in: orphanedIds } });
            console.log(`   ✅ Cleaned ${result.deletedCount} orphaned subscriptions`);
        } else {
            console.log('   ✅ No orphaned subscriptions found');
        }
    } catch (error) {
        console.error('   ⚠️  Cleanup failed:', error.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Local: http://localhost:${PORT}`);
        console.log(`Network: http://10.36.220.78:${PORT}`);
        startScheduler();
        startCleanupJob(); // 🆕 Add this
        startPushReceiptVerificationJob();
    });
};

startServer();

