const axios = require('axios');
const User = require('../models/User');

/**
 * Get best GitHub token for API request
 * Priority: User's personal token > User's OAuth token > Global token
 */
const getBestTokenForRepo = async (subscriptions) => {
    try {
        // Try each subscription's user for a personal token
        for (const sub of subscriptions) {
            const user = await User.findById(sub.user)
                .select('personalGitHubToken tokenIsValid githubAccessToken authMethod');

            // Priority 1: Personal token (best rate limits)
            if (user?.personalGitHubToken && user?.tokenIsValid !== false) {
                try {
                    // Decrypt the token before using it
                    const decryptedToken = user.getPersonalGitHubToken();
                    return { 
                        Authorization: `token ${decryptedToken}`,
                        source: 'personal',
                        userId: user._id
                    };
                } catch (error) {
                    console.warn(`⚠️  Token decryption failed for user ${sub.user} - marking invalid`);
                    // Mark token as invalid to skip in future
                    await User.findByIdAndUpdate(sub.user, { tokenIsValid: false, rateLimitTier: 'default' }).catch(() => {});
                    // Fall through to next priority
                }
            }

            // Priority 2: OAuth token from GitHub login
            if (user?.authMethod === 'github' && user?.githubAccessToken) {
                return { 
                    Authorization: `token ${user.githubAccessToken}`,
                    source: 'oauth',
                    userId: user._id
                };
            }
        }

        // Priority 3: Global fallback token
        if (process.env.GITHUB_TOKEN) {
            return { 
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
                source: 'global',
                userId: null
            };
        }

        // No token (60 req/hour limit)
        return { source: 'none', userId: null };

    } catch (error) {
        console.error('❌ Error getting token:', error.message);
        return process.env.GITHUB_TOKEN 
            ? { Authorization: `token ${process.env.GITHUB_TOKEN}`, source: 'global' }
            : { source: 'none' };
    }
};

/**
 * Make GitHub API request with rate limit handling
 */
const makeGitHubRequest = async (url, headers = {}, retries = 1) => {
    try {
        const response = await axios.get(url, { headers });
        
        // Log if rate limit is low
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining && parseInt(remaining) < 100) {
            console.warn(`⚠️ Rate limit low: ${remaining} remaining`);
        }
        
        return response;
    } catch (error) {
        // Handle 403 rate limit
        if (error.response?.status === 403 && 
            error.response.headers['x-ratelimit-remaining'] === '0') {
            
            const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
            const waitTime = resetTime - Date.now();
            
            console.error(`❌ Rate limit exceeded. Resets in ${Math.ceil(waitTime/60000)}min`);
            
            // Retry after reset (if retries available and wait < 1 hour)
            if (retries > 0 && waitTime < 3600000) {
                console.log(`⏳ Waiting ${Math.ceil(waitTime/1000)}s before retry...`);
                await new Promise(r => setTimeout(r, waitTime + 1000));
                return makeGitHubRequest(url, headers, retries - 1);
            }
        }
        
        throw error;
    }
};

/**
 * Verify GitHub token is valid
 */
const verifyToken = async (token) => {
    try {
        const response = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${token}` }
        });
        return { valid: true, user: response.data };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

/**
 * Get rate limit info for a token
 */
const getRateLimitInfo = async (token) => {
    try {
        const response = await axios.get('https://api.github.com/rate_limit', {
            headers: { Authorization: `token ${token}` }
        });
        return response.data.rate;
    } catch (error) {
        console.error('Error getting rate limit info:', error.message);
        return null;
    }
};

/**
 * Check if user should get faster checks based on their token tier
 */
const getCheckFrequencyForUser = async (userId) => {
    try {
        const user = await User.findById(userId)
            .select('rateLimitTier personalGitHubToken tokenIsValid');

        // Personal token = 30min checks
        if (user?.personalGitHubToken && user?.tokenIsValid !== false) {
            try {
                // Verify token can be decrypted
                user.getPersonalGitHubToken();
                return 30; // minutes
            } catch (error) {
                console.error('Token decryption failed, using default tier:', error.message);
                return 60;
            }
        }

        // Default = 60min checks
        return 60;
    } catch (error) {
        return 60; // Default fallback
    }
};

module.exports = {
    getBestTokenForRepo,
    makeGitHubRequest,
    verifyToken,
    getRateLimitInfo,
    getCheckFrequencyForUser
};
