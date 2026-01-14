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
            // Fetch latest issue number to start tracking from NOW
            const issuesRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=1`, { headers });
            const latestNum = issuesRes.data.length > 0 ? issuesRes.data[0].number : 0;

            repository = await Repository.create({
                githubUrl: url,
                owner,
                name: repo,
                latestIssueNumber: latestNum,
                lastChecked: new Date()
            });
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
                // Fetch open issues (limited page size to avoid huge responses)
                const issuesRes = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`,
                    { headers }
                );
                const issues = issuesRes.data || [];

                for (const issue of issues) {
                    const issueLabels = (issue.labels || []).map(l => l.name);
                    const matched = issueLabels.filter(label => subscription.labels.includes(label));
                    if (matched.length === 0) continue;

                    await Notification.create({
                        user: subscription.user,
                        repository: repository._id,
                        issueTitle: issue.title,
                        issueUrl: issue.html_url,
                        matchedLabels: matched
                    });
                }
            } catch (seedErr) {
                console.error('Error seeding initial issues for subscription:', seedErr.message);
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
        const allowed = ['labels', 'active', 'visible'];
        const updates = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }

        if (updates.labels && !Array.isArray(updates.labels)) {
            return res.status(400).json({ message: 'labels must be an array of strings' });
        }

        const sub = await Subscription.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updates,
            { new: true }
        ).populate('repository');

        if (!sub) return res.status(404).json({ message: 'Subscription not found' });
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
        res.json({ message: 'Subscription deleted' });
    } catch (error) {
        console.error('Delete subscription error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
