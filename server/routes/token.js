const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { verifyToken, getRateLimitInfo } = require('../utils/githubHelpers');
const router = express.Router();

/**
 * Add/Update Personal GitHub Token
 * POST /api/user/token/github-token
 */
router.post('/github-token', auth, async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ 
            message: 'Token is required' 
        });
    }

    // Validate token format (ghp_ for fine-grained, github_pat_ for classic)
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        return res.status(400).json({ 
            message: 'Invalid GitHub token format. Please use a personal access token.' 
        });
    }

    try {
        // Verify token is valid
        const tokenVerification = await verifyToken(token);
        if (!tokenVerification.valid) {
            return res.status(400).json({ 
                message: 'Invalid GitHub token. Please check and try again.' 
            });
        }

        // Check rate limit
        const rateLimit = await getRateLimitInfo(token);
        if (!rateLimit) {
            return res.status(500).json({ 
                message: 'Failed to verify rate limit' 
            });
        }

        // Update user with token
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                personalGitHubToken: token,
                tokenAddedAt: new Date(),
                tokenLastVerified: new Date(),
                tokenIsValid: true,
                rateLimitTier: 'personal' // Upgrade to 30min checks
            },
            { new: true, select: '-personalGitHubToken -password' }
        );

        res.json({
            message: 'GitHub token added successfully',
            user,
            rateLimit: {
                limit: rateLimit.limit,
                remaining: rateLimit.remaining,
                reset: new Date(rateLimit.reset * 1000)
            },
            benefits: {
                checkFrequency: '30 minutes',
                privateRepos: true,
                rateLimit: `${rateLimit.limit} requests/hour`
            }
        });

    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(500).json({ message: 'Failed to verify token' });
    }
});

/**
 * Remove Personal GitHub Token
 * DELETE /api/user/token/github-token
 */
router.delete('/github-token', auth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            personalGitHubToken: null,
            tokenAddedAt: null,
            tokenLastVerified: null,
            tokenIsValid: true,
            rateLimitTier: 'default' // Downgrade to 60min checks
        });

        res.json({ 
            message: 'GitHub token removed',
            downgrade: {
                checkFrequency: '60 minutes',
                privateRepos: false,
                rateLimit: 'Shared (5000 requests/hour)'
            }
        });
    } catch (error) {
        console.error('Error removing token:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * Get Token Status
 * GET /api/user/token/github-token/status
 */
router.get('/github-token/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('personalGitHubToken tokenAddedAt tokenLastVerified tokenIsValid rateLimitTier');

        const hasToken = !!user.personalGitHubToken;

        if (!hasToken) {
            return res.json({
                hasToken: false,
                tier: 'default',
                checkFrequency: '60 minutes',
                privateRepos: false
            });
        }

        // Verify token still works (decrypt if needed)
        try {
            let decryptedToken;
            try {
                decryptedToken = user.getPersonalGitHubToken();
            } catch (error) {
                console.error('Failed to decrypt token:', error.message);
                return res.status(400).json({
                    hasToken: false,
                    error: 'Token decryption failed. Please re-add your token.',
                    tier: 'default',
                    checkFrequency: '60 minutes'
                });
            }

            const rateResponse = await getRateLimitInfo(decryptedToken);
            if (!rateResponse) {
                throw new Error('Failed to get rate limit');
            }

            // Update last verified
            user.tokenLastVerified = new Date();
            user.tokenIsValid = true;
            await user.save();

            res.json({
                hasToken: true,
                tier: user.rateLimitTier,
                addedAt: user.tokenAddedAt,
                lastVerified: user.tokenLastVerified,
                isValid: true,
                checkFrequency: user.rateLimitTier === 'personal' ? '30 minutes' : '60 minutes',
                privateRepos: true,
                rateLimit: {
                    limit: rateResponse.limit,
                    remaining: rateResponse.remaining,
                    reset: new Date(rateResponse.reset * 1000)
                }
            });

        } catch (verifyError) {
            // Token is invalid
            user.tokenIsValid = false;
            user.rateLimitTier = 'default';
            await user.save();

            res.json({
                hasToken: true,
                tier: 'default',
                isValid: false,
                error: 'Token is invalid or expired. Please update.',
                addedAt: user.tokenAddedAt
            });
        }

    } catch (error) {
        console.error('Error getting token status:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
