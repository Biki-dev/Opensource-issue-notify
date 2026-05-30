const express = require('express');
const axios = require('axios');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');
const User = require('../models/User');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBestTokenForRepo } = require('../utils/githubHelpers');
const { normalizeStringList, issueMatchesSubscription, toLowercaseList } = require('../utils/subscriptionMatching');

// Helper to extract owner/repo
const parseGitHubUrl = (url) => {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = url.match(regex);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace('.git', '') };
};

// Standard GitHub request config
const getGitHubRequestConfig = (authHeader) => ({
    headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'IssueWatch-App',
        ...(authHeader ? { Authorization: authHeader } : {})
    },
    timeout: 15000
});

/**
 * Build a prioritised list of auth tokens for a given user.
 * Returns an array of Authorization header strings (or undefined for anonymous).
 * Order: personal token → OAuth token → global env token → anonymous
 */
const getAuthCandidates = async (userId) => {
    const seen = new Set();
    const candidates = [];

    const push = (token) => {
        const t = (token || '').trim();
        if (!t || seen.has(t)) return;
        seen.add(t);
        // Use 'Bearer' per GitHub's recommendation for PATs
        candidates.push(`Bearer ${t}`);
    };

    if (userId) {
        try {
            const user = await User.findById(userId)
                .select('personalGitHubToken githubAccessToken tokenIsValid authMethod');

            if (user?.personalGitHubToken && user?.tokenIsValid !== false) {
                try { push(user.getPersonalGitHubToken()); } catch (_) {}
            }

            if (user?.authMethod === 'github') {
                try { push(user.getGithubAccessToken?.()); } catch (_) {}
            }
        } catch (_) {}
    }

    push(process.env.GITHUB_TOKEN);

    // Always append undefined so we try anonymous as a last resort
    candidates.push(undefined);

    return candidates;
};

/**
 * Make a GitHub API request trying each auth candidate in order.
 * Skips to the next candidate on 401/403; throws on other errors.
 */
const githubGet = async (url, authCandidates) => {
    let lastError;

    for (const authHeader of authCandidates) {
        try {
            const response = await axios.get(url, getGitHubRequestConfig(authHeader));
            if (authHeader) {
                console.log(`🔑 GitHub auth: ${authHeader.startsWith('Bearer ghp') ? 'personal-PAT' : authHeader.startsWith('Bearer gho') ? 'oauth' : 'env-token'}`);
            } else {
                console.log('🔑 GitHub auth: anonymous');
            }
            return response;
        } catch (error) {
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                // This credential failed — try the next one
                console.warn(`⚠️  GitHub auth candidate rejected (${status}), trying next...`);
                lastError = error;
                continue;
            }
            // Non-auth error (404, 5xx, network) — throw immediately
            throw error;
        }
    }

    // All candidates exhausted
    throw lastError || new Error('All GitHub auth candidates failed');
};

// PREVIEW: Fetch Repo details + Labels
router.post('/preview', auth, async (req, res) => {
    const { url } = req.body;
    const parsed = parseGitHubUrl(url);
    if (!parsed) return res.status(400).json({ message: 'Invalid GitHub URL' });

    try {
        const { owner, repo } = parsed;
        const candidates = await getAuthCandidates(req.user?.id);

        const [repoRes, labelsRes] = await Promise.all([
            githubGet(`https://api.github.com/repos/${owner}/${repo}`, candidates),
            githubGet(`https://api.github.com/repos/${owner}/${repo}/labels`, candidates)
        ]);

        res.json({
            owner: repoRes.data.owner.login,
            name: repoRes.data.name,
            description: repoRes.data.description,
            avatar: repoRes.data.owner.avatar_url,
            labels: labelsRes.data.map(l => ({ name: l.name, color: l.color, description: l.description }))
        });
    } catch (error) {
        const status = error?.response?.status;
        const githubMessage = error?.response?.data?.message;
        console.error('Preview fetch failed:', { status, message: error.message, githubMessage });

        if (status === 404) {
            return res.status(404).json({ message: 'Repository not found or private' });
        }
        if (status === 401 || status === 403) {
            return res.status(503).json({
                message: 'All GitHub credentials rejected. Check your personal token or try again later.',
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
        const candidates = await getAuthCandidates(req.user?.id);

        const ghGet = (path) =>
            githubGet(`https://api.github.com/repos/${owner}/${repo}${path}`, candidates);

        // Find or Create Repository
        let repository = await Repository.findOne({ githubUrl: url });
        if (!repository) {
            const [repoInfoRes, issuesRes] = await Promise.all([
                ghGet(''),
                ghGet('/issues?per_page=1')
            ]);

            const latestNum = issuesRes.data.length > 0 ? issuesRes.data[0].number : 0;

            repository = await Repository.create({
                githubUrl: url,
                owner,
                name: repo,
                ownerAvatarUrl: repoInfoRes.data.owner.avatar_url,
                latestIssueNumber: latestNum,
                lastChecked: null
            });
        } else if (!repository.ownerAvatarUrl) {
            const repoInfoRes = await ghGet('');
            repository.ownerAvatarUrl = repoInfoRes.data.owner.avatar_url;
            await repository.save();
        }

        const existingSub = await Subscription.findOne({ user: req.user.id, repository: repository._id });
        const isNewSubscription = !existingSub;
        const normalizedLabels = normalizeStringList(labels);
        const normalizedKeywords = normalizeStringList(keywords);

        const subscription = await Subscription.findOneAndUpdate(
            { user: req.user.id, repository: repository._id },
            { labels: normalizedLabels, keywords: normalizedKeywords, active: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Seed initial notifications for brand-new subscriptions
        if (isNewSubscription && normalizedLabels.length > 0) {
            try {
                console.log(`📌 Seeding initial notifications for ${owner}/${repo}`);
                const issuesRes = await ghGet('/issues?state=open&per_page=100');
                const issues = issuesRes.data || [];
                let createdCount = 0;

                for (const issue of issues) {
                    if (!issueMatchesSubscription(issue, subscription)) continue;

                    const issueLabels = (issue.labels || []).map(l => l.name).filter(Boolean);
                    const labelSet = new Set(toLowercaseList(subscription.labels));
                    const matched = issueLabels.filter(l => labelSet.has(l.toLowerCase()));

                    try {
                        const result = await Notification.updateOne(
                            { user: subscription.user, repository: repository._id, issueUrl: issue.html_url },
                            { $set: { issueTitle: issue.title, matchedLabels: matched, isRead: false } },
                            { upsert: true }
                        );
                        if (result.upsertedId) createdCount++;
                    } catch (err) {
                        console.warn(`   ⚠️  Notification upsert failed for #${issue.number}:`, err.message);
                    }
                }
                console.log(`   ✅ Seeded ${createdCount} initial notifications`);
            } catch (seedErr) {
                console.error('❌ Seeding failed:', seedErr.message);
            }
        }

        res.json(subscription);
    } catch (error) {
        console.error('Subscribe error:', error.message);
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

/**
 * GET ACTIVITY SUMMARY
 *
 * CHANGED: Instead of hitting the GitHub API live on every dashboard open
 * (which hammers rate limits), we now read from the Notifications collection
 * which is already populated by the scheduler. This is instant and free.
 *
 * weekCount  = notifications created in last 7 days for this repo
 * monthCount = notifications created in last 30 days for this repo
 */
router.get('/activity', auth, async (req, res) => {
    try {
        const activeSubs = await Subscription.find({ user: req.user.id, active: true })
            .populate('repository')
            .lean();

        const repoMap = new Map();
        for (const sub of activeSubs) {
            if (!sub.repository) continue;
            const id = sub.repository._id.toString();
            if (!repoMap.has(id)) {
                repoMap.set(id, {
                    repoId: sub.repository._id,
                    owner: sub.repository.owner,
                    name: sub.repository.name,
                    ownerAvatarUrl: sub.repository.ownerAvatarUrl
                });
            }
        }

        if (repoMap.size === 0) {
            return res.json({ activity: [] });
        }

        const repoIds = Array.from(repoMap.keys()).map(id => {
            const { Repository: Repo } = require('../models/Resources');
            return id;
        });

        const weekCutoff  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
        const monthCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // One aggregation query — no GitHub API calls
        const counts = await Notification.aggregate([
            {
                $match: {
                    user: req.user._id,
                    repository: { $in: Array.from(repoMap.keys()).map(id => {
                        const mongoose = require('mongoose');
                        return new mongoose.Types.ObjectId(id);
                    }) },
                    createdAt: { $gte: monthCutoff }
                }
            },
            {
                $group: {
                    _id: '$repository',
                    monthCount: { $sum: 1 },
                    weekCount: {
                        $sum: {
                            $cond: [{ $gte: ['$createdAt', weekCutoff] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Build final activity list — include all repos even if zero notifications
        const countMap = new Map(counts.map(c => [c._id.toString(), c]));
        const activity = Array.from(repoMap.values()).map(repo => {
            const c = countMap.get(repo.repoId.toString()) || {};
            return {
                repoId: repo.repoId,
                owner: repo.owner,
                name: repo.name,
                ownerAvatarUrl: repo.ownerAvatarUrl,
                weekCount:  c.weekCount  || 0,
                monthCount: c.monthCount || 0,
            };
        });

        res.json({ activity });
    } catch (error) {
        console.error('Get activity error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE SUBSCRIPTION (labels / keywords / active / visible / muted)
router.patch('/:id', auth, async (req, res) => {
    try {
        const allowed = ['labels', 'keywords', 'active', 'visible', 'muted'];
        const updates = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }

        if (updates.labels !== undefined && !Array.isArray(updates.labels)) {
            return res.status(400).json({ message: 'labels must be an array of strings' });
        }
        if (updates.keywords !== undefined && !Array.isArray(updates.keywords)) {
            return res.status(400).json({ message: 'keywords must be an array of strings' });
        }

        if (Array.isArray(updates.labels))   updates.labels   = normalizeStringList(updates.labels);
        if (Array.isArray(updates.keywords)) updates.keywords = normalizeStringList(updates.keywords);

        const criteriaChanged = Array.isArray(updates.labels) || Array.isArray(updates.keywords);

        const sub = await Subscription.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updates,
            { new: true }
        ).populate('repository');

        if (!sub) return res.status(404).json({ message: 'Subscription not found' });

        // Re-seed notifications if filtering criteria changed
        if (criteriaChanged && sub.repository && sub.labels.length > 0) {
            try {
                await Notification.deleteMany({ user: req.user.id, repository: sub.repository._id });

                const { owner, name } = sub.repository;
                const candidates = await getAuthCandidates(req.user.id);
                const issuesRes = await githubGet(
                    `https://api.github.com/repos/${owner}/${name}/issues?state=open&per_page=100`,
                    candidates
                );
                const issues = issuesRes.data || [];
                const newNotifs = [];

                for (const issue of issues) {
                    if (issue.pull_request) continue;
                    if (!issueMatchesSubscription(issue, sub)) continue;

                    const issueLabels = (issue.labels || []).map(l => l.name).filter(Boolean);
                    const labelSet = new Set(toLowercaseList(sub.labels));
                    const matched = issueLabels.filter(l => labelSet.has(l.toLowerCase()));

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
                    // insertMany with ordered:false so duplicates don't abort the whole batch
                    await Notification.insertMany(newNotifs, { ordered: false }).catch(() => {});
                }
            } catch (err) {
                console.error('Error reseeding on label update:', err.message);
            }
        }

        res.json(sub);
    } catch (error) {
        console.error('Update subscription error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE SUBSCRIPTION
router.delete('/:id', auth, async (req, res) => {
    try {
        const deleted = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!deleted) return res.status(404).json({ message: 'Subscription not found' });

        await Notification.deleteMany({ user: req.user.id, repository: deleted.repository }).catch(() => {});

        res.json({ message: 'Subscription deleted' });
    } catch (error) {
        console.error('Delete subscription error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;