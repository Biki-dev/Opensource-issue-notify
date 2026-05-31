const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const { checkIssues } = require('../services/scheduler');
const { sendPushNotification } = require('../services/pushNotifications');
const { buildPushStatusForUser } = require('../utils/debugHelpers');

// Manual Trigger for Debugging
router.post('/check', async (req, res) => {
    const backfill = req.body?.backfill === true || req.query?.backfill === '1' || req.query?.backfill === 'true';
    try {
        await checkIssues({ backfill });
        res.json({ message: 'Check completed', backfill });
    } catch (error) {
        console.error('Debug check failed:', error.message);
        res.status(500).json({ message: 'Debug check failed', error: error.message, backfill });
    }
});

// Debug: Check push token registration status
router.get('/push-tokens', async (req, res) => {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : null;

        let currentUser = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                currentUser = await User.findById(decoded.id, 'email expoPushTokens expoPushToken deviceInfo notificationsEnabled');
            } catch (_) {
                currentUser = null;
            }
        }

        if (req.query.me === '1') {
            if (!currentUser) {
                return res.status(401).json({ message: 'Provide a valid Bearer token to inspect the current user' });
            }

            return res.json({
                message: 'Push token status for current user',
                currentUser: buildPushStatusForUser(currentUser)
            });
        }

        const users = await User.find({}, 'email expoPushTokens expoPushToken deviceInfo notificationsEnabled').limit(10);
        const status = users.map(u => buildPushStatusForUser(u));

        res.json({ message: 'Push token status for latest 10 users', count: users.length, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEST: Send test push notification
router.post('/test-push/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('email expoPushTokens expoPushToken deviceInfo notificationsEnabled');
        if (!user) return res.status(404).json({ error: 'User not found' });

        console.log(`\n🧪🧪🧪 SENDING TEST NOTIFICATION TO USER: ${userId}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Has Token: ${buildPushStatusForUser(user).hasToken}`);
        console.log(`   Notifications Enabled: ${user.notificationsEnabled}`);
        console.log(`   Device: ${user.deviceInfo?.platform || 'unknown'}\n`);

        const result = await sendPushNotification(userId, {
            _id: 'test-' + Date.now(),
            issueTitle: '🧪 TEST NOTIFICATION',
            issueUrl: 'https://github.com/test/test/issues/1',
            matchedLabels: ['test'],
            repository: { owner: 'test', name: 'test' }
        });

        res.json({ message: 'Test notification sent', result, userInfo: buildPushStatusForUser(user) });
    } catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
