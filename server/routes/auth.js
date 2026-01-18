const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Regular Email/Password Signup
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    console.log('Signup request received:', { name, email, passwordLength: password?.length });
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({
            name,
            email,
            password,
            authMethod: 'email'
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            authMethod: user.authMethod,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Regular Email/Password Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if user signed up with GitHub
        if (user.authMethod === 'github') {
            return res.status(401).json({
                message: 'This account uses GitHub sign-in. Please continue with GitHub.'
            });
        }

        if (await user.matchPassword(password)) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                notificationsEnabled: user.notificationsEnabled,
                plan: user.plan,
                authMethod: user.authMethod,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Logout - Deactivate user subscriptions
router.post('/logout', auth, async (req, res) => {
    try {
        const { Subscription } = require('../models/Resources');
        const Notification = require('../models/Notification');

        console.log(`🚪 Logout initiated for user: ${req.user.email}`);

        // 1. Deactivate all subscriptions
        const deactivated = await Subscription.updateMany(
            { user: req.user.id },
            { active: false }
        );
        console.log(`   ✓ Deactivated ${deactivated.modifiedCount} subscriptions`);

        // 2. Mark all notifications as read (cleanup)
        const markedRead = await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true }
        );
        console.log(`   ✓ Marked ${markedRead.modifiedCount} notifications as read`);

        // 3. Clear personal token on logout for security
        // This ensures the token is removed from database immediately
        await User.findByIdAndUpdate(
            req.user.id,
            {
                personalGitHubToken: null,
                tokenIsValid: false,
                rateLimitTier: 'default', // Reset to default tier
                expoPushToken: null // ✅ Clear push token on logout
            }
        );
        console.log(`   ✓ Cleared personal GitHub token`);

        console.log(`✅ Logout complete for user: ${req.user.email}`);

        res.json({
            message: 'Logged out successfully',
            subscriptionsPaused: deactivated.modifiedCount,
            notificationsCleared: markedRead.modifiedCount
        });
    } catch (error) {
        console.error('❌ Logout Error:', error.message);
        res.status(500).json({ message: 'Server error during logout' });
    }
});

// GitHub OAuth Login/Signup
router.post('/github', async (req, res) => {
    const { code, redirectUri } = req.body;

    if (!code) {
        return res.status(400).json({ message: 'Authorization code required' });
    }

    try {
        // Step 1: Exchange code for access token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri
            },
            {
                headers: { Accept: 'application/json' }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        if (!accessToken) {
            return res.status(400).json({ message: 'Failed to obtain access token' });
        }

        // Step 2: Get user info from GitHub
        const [userResponse, emailsResponse] = await Promise.all([
            axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` }
            }),
            axios.get('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
        ]);

        const githubUser = userResponse.data;
        const emails = emailsResponse.data;

        // Get primary email
        const primaryEmail = emails.find(e => e.primary)?.email || emails[0]?.email;

        if (!primaryEmail) {
            return res.status(400).json({ message: 'No email found in GitHub account' });
        }

        // Step 3: Find or create user
        let user = await User.findOne({ githubId: githubUser.id.toString() });

        if (!user) {
            // Check if email already exists with different auth method
            const existingUser = await User.findOne({ email: primaryEmail });

            if (existingUser && existingUser.authMethod === 'email') {
                return res.status(400).json({
                    message: 'An account with this email already exists. Please sign in with email/password.'
                });
            }

            // Create new user
            user = await User.create({
                name: githubUser.name || githubUser.login,
                email: primaryEmail,
                githubId: githubUser.id.toString(),
                githubUsername: githubUser.login,
                profilePicture: githubUser.avatar_url,
                authMethod: 'github',
                githubAccessToken: accessToken,
                lastProfileUpdate: Date.now()
            });
        } else {
            // Update existing GitHub user's profile picture if changed
            user.profilePicture = githubUser.avatar_url;
        }
        user.githubAccessToken = accessToken;
        user.lastProfileUpdate = Date.now();
        await user.save();


        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            githubUsername: user.githubUsername,
            notificationsEnabled: user.notificationsEnabled,
            plan: user.plan,
            authMethod: user.authMethod,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error('GitHub Auth Error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'GitHub authentication failed',
            error: error.message
        });
    }
});

// Get current user's profile
router.get('/me', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Periodic GitHub Profile Sync (7 days)
        if (user.authMethod === 'github') {
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            const lastUpdate = user.lastProfileUpdate ? new Date(user.lastProfileUpdate).getTime() : 0;

            if (Date.now() - lastUpdate > sevenDays) {
                const userWithToken = await User.findById(req.user._id).select('githubAccessToken');
                if (userWithToken?.githubAccessToken) {
                    try {
                        const ghRes = await axios.get('https://api.github.com/user', {
                            headers: { Authorization: `Bearer ${userWithToken.githubAccessToken}` }
                        });

                        // Update if changed
                        if (user.profilePicture !== ghRes.data.avatar_url) {
                            user.profilePicture = ghRes.data.avatar_url;
                        }

                        // Always update timestamp to reset timer
                        user.lastProfileUpdate = Date.now();
                        await user.save();
                        console.log('Synced GitHub profile for:', user.email);
                    } catch (e) {
                        console.log('Background GitHub sync failed:', e.message);
                        // If token invalid (401), could clear it here
                    }
                }
            }
        }

        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update current user's profile
router.patch('/me', auth, async (req, res) => {
    try {
        const allowed = ['name', 'email', 'notificationsEnabled', 'plan', 'profilePicture'];
        const updates = {};

        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true,
            select: '-password',
        });

        res.json(user);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// server/routes/auth.js

// Register Expo push token for push notifications
router.post('/register-push-token', auth, async (req, res) => {
    const { expoPushToken, deviceInfo } = req.body;

    try {
        if (!expoPushToken) {
            return res.status(400).json({ message: 'expoPushToken is required' });
        }

        if (!Expo.isExpoPushToken(expoPushToken)) {
            return res.status(400).json({ message: 'Invalid Expo push token format' });
        }

        // ✅ SAVE and VERIFY
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                expoPushToken,
                deviceInfo,
                notificationsEnabled: true // ✅ Ensure enabled by default
            },
            {
                new: true,
                select: '-password -personalGitHubToken',
                runValidators: true // ✅ Run schema validation
            }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ✅ VERIFY token was saved
        const savedToken = user.expoPushToken;
        if (savedToken !== expoPushToken) {
            throw new Error('Token save verification failed');
        }

        console.log(`✅ Push token VERIFIED for user ${req.user.id}`);
        console.log(`   Token: ${expoPushToken.substring(0, 30)}...`);
        console.log(`   Platform: ${deviceInfo?.platform || 'unknown'}`);

        res.json({
            message: 'Push token registered successfully',
            success: true,
            token: savedToken.substring(0, 30) + '...' // Return partial token for verification
        });
    } catch (error) {
        console.error(`❌ Error registering push token:`, error.message);
        res.status(500).json({ message: 'Failed to register push token', error: error.message });
    }
});

// 🆕 DEBUG: Check if user has push token registered
router.get('/debug/push-status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('expoPushToken deviceInfo notificationsEnabled');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { Expo } = require('expo-server-sdk');
        const hasValidToken = user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken);

        res.json({
            userId: req.user.id,
            hasToken: !!user.expoPushToken,
            token: user.expoPushToken ? user.expoPushToken.substring(0, 30) + '...' : null,
            hasValidToken,
            notificationsEnabled: user.notificationsEnabled,
            deviceInfo: user.deviceInfo,
            status: hasValidToken ? '✅ Ready to receive push notifications' : '❌ Not ready'
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ message: 'Debug failed', error: error.message });
    }
});

// 🆕 DEBUG: Explicitly trigger a test notification to the current user
router.post('/debug/test-push', auth, async (req, res) => {
    try {
        console.log(`🧪 Received test-push request for user: ${req.user.email}`);
        const { sendPushNotification } = require('../services/pushNotifications');

        const result = await sendPushNotification(req.user.id, {
            issueTitle: '🧪 System Test: Push notifications are working!',
            issueUrl: 'https://github.com/Biki-dev/IssueWatch',
            matchedLabels: ['test', 'debug'],
            repository: {
                owner: 'System',
                name: 'Test'
            }
        });

        if (result.success) {
            res.json({ message: 'Test notification sent to Expo!', result });
        } else {
            res.status(400).json({ message: 'Expo rejected the notification', reason: result.reason, error: result.error });
        }
    } catch (error) {
        console.error('❌ Test-push error:', error.message);
        res.status(500).json({ message: 'Internal server error during test-push', error: error.message });
    }
});

module.exports = router;