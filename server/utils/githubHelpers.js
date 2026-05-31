const axios = require('axios');
const User = require('../models/User');

const makeGitHubAuthHeaders = (token) => {
    const trimmed = (token || '').trim();
    if (!trimmed) return [];

    return [
        { Authorization: `Bearer ${trimmed}` },
        { Authorization: `token ${trimmed}` }
    ];
};

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
                    if (token) {
                        return {
                            Authorization: `Bearer ${token}`,
                            source: 'personal',
                            hasToken: true
                        };
                    }
                } catch (error) {
                    console.warn(`⚠️  Personal token decryption failed for user ${userId} — marking invalid`);
                    await User.findByIdAndUpdate(userId, { tokenIsValid: false, rateLimitTier: 'default' }).catch(() => {});
                }
            }

            if (user?.authMethod === 'github') {
                try {
                    const token = user.getGithubAccessToken?.();
                    if (token) {
                        return {
                            Authorization: `Bearer ${token}`,
                            source: 'oauth',
                            hasToken: true
                        };
                    }
                } catch (_) {}
            }
        }

        if (process.env.GITHUB_TOKEN) {
            return {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                source: 'global',
                hasToken: true
            };
        }

        return { source: 'none', hasToken: false };
    } catch (error) {
        console.error('❌ Error getting token:', error.message);
        if (process.env.GITHUB_TOKEN) {
            return {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                source: 'global',
                hasToken: true
            };
        }
        return { source: 'none', hasToken: false };
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
    let lastError;

    for (const headers of makeGitHubAuthHeaders(token)) {
        try {
            const response = await axios.get('https://api.github.com/user', {
                headers,
                timeout: 10000
            });
            return { valid: true, user: response.data };
        } catch (error) {
            lastError = error;
        }
    }

    return {
        valid: false,
        error: lastError?.message || 'Token verification failed',
        githubMessage: lastError?.response?.data?.message || null,
        status: lastError?.response?.status || null
    };
};

/**
 * Get rate limit info for a token.
 */
const getRateLimitInfo = async (token) => {
    for (const headers of makeGitHubAuthHeaders(token)) {
        try {
            const response = await axios.get('https://api.github.com/rate_limit', {
                headers,
                timeout: 10000
            });
            return response.data.rate;
        } catch (error) {
            // Try the alternate auth scheme before giving up.
        }
    }

    console.error('Error getting rate limit info: unable to authenticate with GitHub token');
    return null;
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