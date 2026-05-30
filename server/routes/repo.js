const express = require('express');
const axios = require('axios');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');
const User = require('../models/User');
const router = express.Router();
const auth = require('../middleware/auth'); // Need to create middleware
const { getBestTokenForRepo } = require('../utils/githubHelpers');
const { normalizeStringList, issueMatchesSubscription, toLowercaseList } = require('../utils/subscriptionMatching');

// Helper to extract owner/repo
const parseGitHubUrl = (url) => {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = url.match(regex);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace('.git', '') };
};

const getGitHubHeaderCandidates = async (userId) => {
    const candidates = [];
    const seen = new Set();

    const pushCandidate = (token) => {
        const normalized = (token || '').trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        candidates.push({ Authorization: `token ${normalized}` });
    };

    if (userId) {
        const user = await User.findById(userId)
            .select('personalGitHubToken githubAccessToken tokenIsValid authMethod');

        if (user?.personalGitHubToken && user?.tokenIsValid !== false) {
            try {
                pushCandidate(user.getPersonalGitHubToken());
            } catch (error) {
                console.warn(`⚠️ Personal token decryption failed for user ${userId}:`, error.message);
                await User.findByIdAndUpdate(userId, { tokenIsValid: false, rateLimitTier: 'default' }).catch(() => {});
            }
        }

        if (user?.authMethod === 'github') {
            try {
                pushCandidate(user.getGithubAccessToken?.());
            } catch (error) {
                console.warn(`⚠️ OAuth token decryption failed for user ${userId}:`, error.message);
            }
        }
    }

    pushCandidate(process.env.GITHUB_TOKEN);

    // Always keep an anonymous fallback so public repos still work if a token is invalid.
    candidates.push({});

    return candidates;
};

const isAuthOrRateLimitError = (error) => {
    const status = error?.response?.status;
    return status === 401 || status === 403;
};

const getGitHubRequestConfig = (headers = {}) => ({
    headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'IssueWatch-App',
        ...headers
    }
});

const fetchRepoDataWithFallback = async (owner, repo, headerCandidates) => {
    let lastError;

    for (const headers of headerCandidates) {
        try {
            console.log(`🔑 Preview GitHub auth source: ${headers.Authorization ? 'authenticated' : 'anonymous'}`);
            const [repoRes, labelsRes] = await Promise.all([
                axios.get(`https://api.github.com/repos/${owner}/${repo}`, getGitHubRequestConfig(headers)),
                axios.get(`https://api.github.com/repos/${owner}/${repo}/labels`, getGitHubRequestConfig(headers))
            ]);
            return { repoRes, labelsRes };
        } catch (error) {
            lastError = error;
            if (isAuthOrRateLimitError(error)) {
                continue;
            }
            throw error;
        }
    }

    throw lastError;
};

// PREVIEW: Fetch Repo details + Labels
router.post('/preview', auth, async (req, res) => {
    const { url } = req.body;
    const parsed = parseGitHubUrl(url);
    if (!parsed) return res.status(400).json({ message: 'Invalid GitHub URL' });

    try {
        const { owner, repo } = parsed;
        const headerCandidates = await getGitHubHeaderCandidates(req.user?.id);
        const { repoRes, labelsRes } = await fetchRepoDataWithFallback(owner, repo, headerCandidates);

        res.json({
            owner: repoRes.data.owner.login,
            name: repoRes.data.name,
            description: repoRes.data.description,
            avatar: repoRes.data.owner.avatar_url,
            labels: labelsRes.data.map(l => ({ name: l.name, color: l.color, description: l.description }))
        });
    } catch (error) {
        console.error('Preview fetch failed:', {
            message: error.message,
            status: error?.response?.status,
            githubMessage: error?.response?.data?.message || null,
            githubErrors: error?.response?.data?.errors || null
        });
        const status = error?.response?.status;
        if (status === 404) {
            return res.status(404).json({ message: 'Repository not found or private' });
        }
        if (status === 401 || status === 403) {
            const githubMessage = error.response?.data?.message;
            return res.status(503).json({
                message: 'GitHub API authentication/rate limit failed. Please try again shortly.',
                githubMessage: githubMessage || null
            });
        }
        res.status(500).json({ message: 'Failed to preview repository' });
    }
});

// SUBSCRIBE: Save Subscription
router.post('/subscribe', auth, async (req, res) => {
    const { url, labels, keywords } = req.body;
    const parsed = parseGitHubUrl(url);
    if (!parsed) return res.status(400).json({ message: 'Invalid URL' });

    try {
        const { owner, repo } = parsed;
        const headerCandidates = await getGitHubHeaderCandidates(req.user?.id);

        const fetchFromGitHub = async (path) => {
            let lastError;
            for (const headers of headerCandidates) {
                try {
                            console.log(`🔑 Repo fetch GitHub auth source: ${headers.Authorization ? 'authenticated' : 'anonymous'}`);
                    return await axios.get(`https://api.github.com/repos/${owner}/${repo}${path}`, getGitHubRequestConfig(headers));
                } catch (error) {
                    lastError = error;
                    if (isAuthOrRateLimitError(error)) {
                        continue;
                    }
                    throw error;
                }
            }
            throw lastError;
        };

        // Find or Create Repository
        let repository = await Repository.findOne({ githubUrl: url });
        if (!repository) {
            // Parallel fetch for repository details and latest issue
            const [repoInfoRes, issuesRes] = await Promise.all([
                fetchFromGitHub(''),
                fetchFromGitHub('/issues?per_page=1')
            ]);

            const latestNum = issuesRes.data.length > 0 ? issuesRes.data[0].number : 0;
            const ownerAvatarUrl = repoInfoRes.data.owner.avatar_url;

            repository = await Repository.create({
                githubUrl: url,
                owner,
                name: repo,
                ownerAvatarUrl,
                latestIssueNumber: latestNum,
                lastChecked: null // ✅ Set to null so scheduler picks it up immediately
            });
        } else if (!repository.ownerAvatarUrl) {
            // Update existing repo if avatar is missing
            const repoInfoRes = await fetchFromGitHub('');
            repository.ownerAvatarUrl = repoInfoRes.data.owner.avatar_url;
            await repository.save();
        }

        // Check if this is a brand new subscription for this user/repo
        const existingSub = await Subscription.findOne({ user: req.user.id, repository: repository._id });
        const isNewSubscription = !existingSub;
        const normalizedLabels = normalizeStringList(labels);
        const normalizedKeywords = normalizeStringList(keywords);

        // Create or update Subscription
        const subscription = await Subscription.findOneAndUpdate(
            { user: req.user.id, repository: repository._id },
            { labels: normalizedLabels, keywords: normalizedKeywords, active: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // If this is the first time the user added this repo, seed their dashboard
        // with all currently available issues that match their selected labels.
        if (isNewSubscription && Array.isArray(subscription.labels) && subscription.labels.length > 0) {
            try {
                console.log(`📌 Seeding initial notifications for subscription to ${owner}/${repo}`);

                // Fetch open issues (limited page size to avoid huge responses)
                const issuesRes = await fetchFromGitHub('/issues?state=open&per_page=100');
                const issues = issuesRes.data || [];
                let createdCount = 0;

                for (const issue of issues) {
                    if (!issueMatchesSubscription(issue, subscription)) continue;

                    const issueLabels = (issue.labels || []).map(l => l.name).filter(Boolean);
                    const subscriptionLabelSet = new Set(toLowercaseList(subscription.labels));
                    const matched = issueLabels.filter(label => subscriptionLabelSet.has(label.toLowerCase()));

                    try {
                        // Use updateOne with upsert to prevent duplicates
                        const result = await Notification.updateOne(
                            {
                                user: subscription.user,
                                repository: repository._id,
                                issueUrl: issue.html_url
                            },
                            {
                                $set: {
                                    issueTitle: issue.title,
                                    matchedLabels: matched,
                                    isRead: false
                                }
                            },
                            { upsert: true }
                        );
                        if (result.upsertedId) createdCount++;
                    } catch (err) {
                        console.warn(`   ⚠️  Could not create notification for issue #${issue.number}:`, err.message);
                    }
                }

                console.log(`   ✅ Seeded ${createdCount} initial notifications`);
            } catch (seedErr) {
                console.error('❌ Error seeding initial issues for subscription:', seedErr.message);
                // Do not fail subscription creation if seeding fails
            }
        }

        res.json(subscription);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET SUBSCRIPTIONS
router.get('/', auth, async (req, res) => {
    try {
        const subs = await Subscription.find({ user: req.user.id }).populate('repository');
        res.json(subs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET ACTIVITY SUMMARY (weekly / monthly issue counts per subscribed repo)
router.get('/activity', auth, async (req, res) => {
    try {
        const activeSubs = await Subscription.find({ user: req.user.id, active: true })
            .populate('repository')
            .sort({ createdAt: -1 });

        const repoGroups = new Map();

        for (const sub of activeSubs) {
            if (!sub.repository) continue;

            const repoId = sub.repository._id.toString();
            if (!repoGroups.has(repoId)) {
                repoGroups.set(repoId, {
                    repository: sub.repository,
                    subscriptions: []
                });
            }

            repoGroups.get(repoId).subscriptions.push(sub);
        }

        const monthCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const weekCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const activity = [];

        for (const { repository, subscriptions } of repoGroups.values()) {
            try {
                const headers = await getBestTokenForRepo(subscriptions);
                const candidateHeaders = [];

                if (headers?.Authorization) {
                    candidateHeaders.push({ Authorization: headers.Authorization });
                }

                // Global/user token can become invalid; anonymous fallback still works for public repos.
                candidateHeaders.push({});

                const fetchActivityPage = async (url) => {
                    let lastError;

                    for (const requestHeaders of candidateHeaders) {
                        try {
                            return await axios.get(url, getGitHubRequestConfig(requestHeaders));
                        } catch (error) {
                            lastError = error;
                            if (isAuthOrRateLimitError(error)) {
                                continue;
                            }
                            throw error;
                        }
                    }

                    throw lastError;
                };

                const MAX_PAGES = 5;
                const PER_PAGE = 100;

                let nextUrl = `https://api.github.com/repos/${repository.owner}/${repository.name}/issues?state=all&per_page=${PER_PAGE}&sort=created&direction=desc`;
                let pageCount = 0;
                let weekCount = 0;
                let monthCount = 0;

                while (nextUrl && pageCount < MAX_PAGES) {
                    const response = await fetchActivityPage(nextUrl);
                    const issues = response.data || [];

                    if (issues.length === 0) break;

                    let stopPagination = false;

                    for (const issue of issues) {
                        if (issue.pull_request) continue;

                        const createdAt = new Date(issue.created_at);
                        if (createdAt < monthCutoff) {
                            stopPagination = true;
                            break;
                        }

                        monthCount += 1;
                        if (createdAt >= weekCutoff) {
                            weekCount += 1;
                        }
                    }

                    if (stopPagination) break;

                    pageCount += 1;

                    const linkHeader = response.headers.link;
                    nextUrl = null;

                    if (linkHeader) {
                        const links = linkHeader.split(',');
                        for (const link of links) {
                            if (link.includes('rel="next"')) {
                                const match = link.match(/<([^>]+)>/);
                                if (match) {
                                    nextUrl = match[1];
                                    break;
                                }
                            }
                        }
                    }
                }

                activity.push({
                    repoId: repository._id,
                    owner: repository.owner,
                    name: repository.name,
                    ownerAvatarUrl: repository.ownerAvatarUrl,
                    weekCount,
                    monthCount,
                    subscriptionCount: subscriptions.length
                });
            } catch (repoErr) {
                console.warn(`⚠️ Failed to load activity for ${repository.owner}/${repository.name}:`, repoErr.message);
                activity.push({
                    repoId: repository._id,
                    owner: repository.owner,
                    name: repository.name,
                    ownerAvatarUrl: repository.ownerAvatarUrl,
                    weekCount: 0,
                    monthCount: 0,
                    subscriptionCount: subscriptions.length,
                    error: true
                });
            }
        }

        res.json({ activity });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE SUBSCRIPTION (labels / active / visibility)
router.patch('/:id', auth, async (req, res) => {
    try {
        const allowed = ['labels', 'keywords', 'active', 'visible', 'muted'];
        const updates = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }

        if (updates.labels && !Array.isArray(updates.labels)) {
            return res.status(400).json({ message: 'labels must be an array of strings' });
        }

        if (updates.keywords && !Array.isArray(updates.keywords)) {
            return res.status(400).json({ message: 'keywords must be an array of strings' });
        }

        if (Array.isArray(updates.labels)) {
            updates.labels = normalizeStringList(updates.labels);
        }

        if (Array.isArray(updates.keywords)) {
            updates.keywords = normalizeStringList(updates.keywords);
        }

        const criteriaBeingUpdated = Array.isArray(updates.labels) || Array.isArray(updates.keywords);

        const sub = await Subscription.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updates,
            { new: true }
        ).populate('repository');

        if (!sub) return res.status(404).json({ message: 'Subscription not found' });

        // If labels or keywords were changed, refresh notifications for this repo & user
        if (criteriaBeingUpdated && sub.repository) {
            try {
                // Remove old notifications for this repo + user (old label matches)
                await Notification.deleteMany({ user: req.user.id, repository: sub.repository._id });

                if (Array.isArray(sub.labels) && sub.labels.length > 0) {
                    const { owner, name } = sub.repository;

                    // Use helper to get the best token
                    const { getBestTokenForRepo } = require('../utils/githubHelpers');
                    const headers = await getBestTokenForRepo([{ user: req.user.id }]);

                    // Fetch open issues again and create notifications that match new labels
                    const issuesRes = await axios.get(
                        `https://api.github.com/repos/${owner}/${name}/issues?state=open&per_page=100`,
                        { headers: headers.Authorization ? { Authorization: headers.Authorization } : {} }
                    );
                    const issues = issuesRes.data || [];

                    if (Array.isArray(issues)) {
                        const newNotifs = [];
                        for (const issue of issues) {
                            if (issue.pull_request) continue; // Skip PRs

                            if (!issueMatchesSubscription(issue, sub)) continue;

                            const issueLabels = (issue.labels || []).map(l => l.name).filter(Boolean);
                            const subscriptionLabelSet = new Set(toLowercaseList(sub.labels));
                            const matched = issueLabels.filter(label => subscriptionLabelSet.has(label.toLowerCase()));

                            newNotifs.push({
                                user: req.user.id,
                                repository: sub.repository._id,
                                issueTitle: issue.title,
                                issueUrl: issue.html_url,
                                matchedLabels: matched,
                                isRead: false
                            });
                        }

                        if (newNotifs.length > 0) {
                            await Notification.insertMany(newNotifs);
                        }
                    }
                }
            } catch (err) {
                console.error('Error reseeding notifications on labels update:', err.message);
            }
        }

        res.json(sub);
    } catch (error) {
        console.error('Update subscription error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE SUBSCRIPTION
router.delete('/:id', auth, async (req, res) => {
    try {
        const deleted = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!deleted) return res.status(404).json({ message: 'Subscription not found' });

        // Also remove all notifications for this user + repository
        try {
            await Notification.deleteMany({ user: req.user.id, repository: deleted.repository });
        } catch (cleanupErr) {
            console.error('Error deleting related notifications:', cleanupErr.message);
        }

        res.json({ message: 'Subscription deleted' });
    } catch (error) {
        console.error('Delete subscription error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
