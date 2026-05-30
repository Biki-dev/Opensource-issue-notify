const express = require('express');
const axios = require('axios');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');
const router = express.Router();
const auth = require('../middleware/auth'); // Need to create middleware

// Helper to extract owner/repo
const parseGitHubUrl = (url) => {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = url.match(regex);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace('.git', '') };
};

// PREVIEW: Fetch Repo details + Labels
router.post('/preview', auth, async (req, res) => {
    const { url } = req.body;
    const parsed = parseGitHubUrl(url);
    if (!parsed) return res.status(400).json({ message: 'Invalid GitHub URL' });

    try {
        const { owner, repo } = parsed;
        const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

        // Parallel fetch for details and labels
        const [repoRes, labelsRes] = await Promise.all([
            axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
            axios.get(`https://api.github.com/repos/${owner}/${repo}/labels`, { headers })
        ]);

        res.json({
            owner: repoRes.data.owner.login,
            name: repoRes.data.name,
            description: repoRes.data.description,
            avatar: repoRes.data.owner.avatar_url,
            labels: labelsRes.data.map(l => ({ name: l.name, color: l.color, description: l.description }))
        });
    } catch (error) {
        console.error(error.message);
        res.status(404).json({ message: 'Repository not found or private' });
    }
});

// SUBSCRIBE: Save Subscription
router.post('/subscribe', auth, async (req, res) => {
    const { url, labels } = req.body;
    const parsed = parseGitHubUrl(url);
    if (!parsed) return res.status(400).json({ message: 'Invalid URL' });

    try {
        const { owner, repo } = parsed;
        const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

        // Find or Create Repository
        let repository = await Repository.findOne({ githubUrl: url });
        if (!repository) {
            // Parallel fetch for repository details and latest issue
            const [repoInfoRes, issuesRes] = await Promise.all([
                axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
                axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=1`, { headers })
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
            const repoInfoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
            repository.ownerAvatarUrl = repoInfoRes.data.owner.avatar_url;
            await repository.save();
        }

        // Check if this is a brand new subscription for this user/repo
        const existingSub = await Subscription.findOne({ user: req.user.id, repository: repository._id });
        const isNewSubscription = !existingSub;

        // Create or update Subscription
        const subscription = await Subscription.findOneAndUpdate(
            { user: req.user.id, repository: repository._id },
            { labels: labels, active: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // If this is the first time the user added this repo, seed their dashboard
        // with all currently available issues that match their selected labels.
        if (isNewSubscription && Array.isArray(subscription.labels) && subscription.labels.length > 0) {
            try {
                console.log(`📌 Seeding initial notifications for subscription to ${owner}/${repo}`);

                // Fetch open issues (limited page size to avoid huge responses)
                const issuesRes = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`,
                    { headers }
                );
                const issues = issuesRes.data || [];
                let createdCount = 0;

                for (const issue of issues) {
                    const issueLabels = (issue.labels || []).map(l => l.name);
                    const matched = issueLabels.filter(label => subscription.labels.includes(label));
                    if (matched.length === 0) continue;

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

// UPDATE SUBSCRIPTION (labels / active / visibility)
router.patch('/:id', auth, async (req, res) => {
    try {
        const allowed = ['labels', 'active', 'visible', 'muted'];
        const updates = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }

        if (updates.labels && !Array.isArray(updates.labels)) {
            return res.status(400).json({ message: 'labels must be an array of strings' });
        }

        const labelsBeingUpdated = Array.isArray(updates.labels);

        const sub = await Subscription.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updates,
            { new: true }
        ).populate('repository');

        if (!sub) return res.status(404).json({ message: 'Subscription not found' });

        // If labels were changed, refresh notifications for this repo & user
        if (labelsBeingUpdated && sub.repository) {
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

                            const issueLabels = (issue.labels || []).map(l => l.name);
                            const matched = issueLabels.filter(label => sub.labels.includes(label));
                            if (matched.length === 0) continue;

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
