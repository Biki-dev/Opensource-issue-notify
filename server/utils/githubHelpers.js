const axios = require('axios');
const User = require('../models/User');

/**
 * Get best GitHub token for API request.
 * Priority: personal token → OAuth token → global env token → none
 */
const getBestTokenForRepo = async (subscriptions) => {
    try {
        for (const sub of subscriptions) {
            const userId = sub.user?._id || sub.user;
            const user = await User.findById(userId)
                .select('personalGitHubToken tokenIsValid githubAccessToken authMethod');

            if (user?.personalGitHubToken && user?.tokenIsValid !== false) {
                try {
                    const token = user.getPersonalGitHubToken();
                    if (token) return { Authorization: `Bearer ${token}`, source: 'personal', userId: user._id };
                } catch (error) {
                    console.warn(`⚠️  Personal token decryption failed for user ${userId} — marking invalid`);
                    await User.findByIdAndUpdate(userId, { tokenIsValid: false, rateLimitTier: 'default' }).catch(() => {});
                }
            }

            if (user?.authMethod === 'github') {
                try {
                    const token = user.getGithubAccessToken?.();
                    if (token) return { Authorization: `Bearer ${token}`, source: 'oauth', userId: user._id };
                } catch (_) {}
            }
        }

        if (process.env.GITHUB_TOKEN) {
            return { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, source: 'global', userId: null };
        }

        return { source: 'none', userId: null };
    } catch (error) {
        console.error('❌ Error getting token:', error.message);
        if (process.env.GITHUB_TOKEN) {
            return { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, source: 'global' };
        }
        return { source: 'none' };
    }
};

/**
 * Make GitHub API request with rate limit handling and optional retry.
 */
const makeGitHubRequest = async (url, headers = {}, retries = 1) => {
    try {
        const response = await axios.get(url, { headers });
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining && parseInt(remaining) < 100) {
            console.warn(`⚠️ Rate limit low: ${remaining} remaining`);
        }
        return response;
    } catch (error) {
        if (
            error.response?.status === 403 &&
            error.response.headers['x-ratelimit-remaining'] === '0'
        ) {
            const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
            const waitTime = resetTime - Date.now();
            console.error(`❌ Rate limit exceeded. Resets in ${Math.ceil(waitTime / 60000)}min`);
            if (retries > 0 && waitTime < 3600000) {
                console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s before retry...`);
                await new Promise(r => setTimeout(r, waitTime + 1000));
                return makeGitHubRequest(url, headers, retries - 1);
            }
        }
        throw error;
    }
};

/**
 * Verify a GitHub personal access token.
 */
const verifyToken = async (token) => {
    try {
        const response = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${token.trim()}` },
            timeout: 10000
        });
        return { valid: true, user: response.data };
    } catch (error) {
        return {
            valid: false,
            error: error.message,
            githubMessage: error?.response?.data?.message || null,
            status: error?.response?.status || null
        };
    }
};

/**
 * Get rate limit info for a token.
 */
const getRateLimitInfo = async (token) => {
    try {
        const response = await axios.get('https://api.github.com/rate_limit', {
            headers: { Authorization: `Bearer ${token.trim()}` },
            timeout: 10000
        });
        return response.data.rate;
    } catch (error) {
        console.error('Error getting rate limit info:', error.message);
        return null;
    }
};

/**
 * Check check frequency in minutes for a user.
 */
const getCheckFrequencyForUser = async (userId) => {
    try {
        const user = await User.findById(userId).select('rateLimitTier personalGitHubToken tokenIsValid');
        if (user?.personalGitHubToken && user?.tokenIsValid !== false) {
            try {
                user.getPersonalGitHubToken();
                return 30;
            } catch (_) {}
        }
        return 60;
    } catch (_) {
        return 60;
    }
};

module.exports = {
    getBestTokenForRepo,
    makeGitHubRequest,
    verifyToken,
    getRateLimitInfo,
    getCheckFrequencyForUser
};