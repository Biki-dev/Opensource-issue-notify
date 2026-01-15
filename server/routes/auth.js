const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
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
                authMethod: 'github'
            });
        } else {
            // Update existing GitHub user's profile picture if changed
            if (user.profilePicture !== githubUser.avatar_url) {
                user.profilePicture = githubUser.avatar_url;
                await user.save();
            }
        }

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
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
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

module.exports = router;