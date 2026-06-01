const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const IssueTracker = require('../models/IssueTracker');
const { Repository } = require('../models/Resources');
const { getBestTokenForRepo } = require('../utils/githubHelpers');

const router = express.Router();

const githubConfig = (authorization) => ({
    headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'IssueWatch-App',
        ...(authorization ? { Authorization: authorization } : {})
    },
    timeout: 15000
});

const toPlainText = (markdown = '') => markdown
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/`[^`]+`/g, '[code]')
    .replace(/!\[.*?\]\(.*?\)/g, '[image]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 200);

const extractIssueNumber = (issueUrl) => {
    const match = issueUrl?.match(/\/issues\/(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
};

const fetchGitHubIssueBundle = async ({ owner, name, issueNumber, authorization }) => {
    const [issueRes, commentsRes] = await Promise.all([
        axios.get(
            `https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}`,
            githubConfig(authorization)
        ),
        axios.get(
            `https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}/comments?per_page=100&sort=created&direction=desc`,
            githubConfig(authorization)
        )
    ]);

    return {
        issue: issueRes.data,
        comments: commentsRes.data || []
    };
};

const mapComment = (comment) => ({
    githubCommentId: comment.id,
    author: comment.user?.login || 'unknown',
    authorAvatar: comment.user?.avatar_url || null,
    body: comment.body || '',
    bodyPreview: toPlainText(comment.body || ''),
    createdAt: new Date(comment.created_at),
    isAuthor: ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(comment.author_association),
    reactions: {
        thumbsUp: comment.reactions?.['+1'] || 0,
        thumbsDown: comment.reactions?.['-1'] || 0,
        laugh: comment.reactions?.laugh || 0,
        hooray: comment.reactions?.hooray || 0,
        confused: comment.reactions?.confused || 0,
        heart: comment.reactions?.heart || 0,
        rocket: comment.reactions?.rocket || 0,
        eyes: comment.reactions?.eyes || 0
    }
});

router.post('/', auth, async (req, res) => {
    const { issueUrl, repositoryId } = req.body;

    if (!issueUrl || !repositoryId) {
        return res.status(400).json({ message: 'issueUrl and repositoryId are required' });
    }

    try {
        const repository = await Repository.findById(repositoryId).lean();
        if (!repository) {
            return res.status(404).json({ message: 'Repository not found' });
        }

        const issueNumber = extractIssueNumber(issueUrl);
        if (!issueNumber) {
            return res.status(400).json({ message: 'Invalid issue URL' });
        }

        const existingTracker = await IssueTracker.findOne({ user: req.user.id, issueUrl });
        if (existingTracker?.active) {
            return res.status(409).json({ message: 'Already tracking this issue', tracker: existingTracker });
        }

        const tokenResult = await getBestTokenForRepo([{ user: req.user }]);
        const { issue, comments } = await fetchGitHubIssueBundle({
            owner: repository.owner,
            name: repository.name,
            issueNumber,
            authorization: tokenResult.Authorization
        });

        const mappedComments = comments.map(mapComment).reverse();
        const newestComment = mappedComments[mappedComments.length - 1] || null;

        const trackerPayload = {
            user: req.user.id,
            repository: repository._id,
            issueNumber,
            issueTitle: issue.title,
            issueUrl,
            issueState: issue.state,
            issueBody: (issue.body || '').substring(0, 5000),
            issueBodyPreview: toPlainText(issue.body || ''),
            issueAuthor: issue.user?.login || null,
            issueAuthorAvatar: issue.user?.avatar_url || null,
            comments: mappedComments,
            lastCommentId: newestComment?.githubCommentId || 0,
            commentCount: issue.comments || mappedComments.length,
            newCommentCount: 0,
            lastChecked: new Date(),
            lastSeenAt: new Date(),
            active: true,
            notifyOnAnyComment: true,
            notifyOnClose: true,
            notifyOnMaintainerOnly: false
        };

        const tracker = existingTracker
            ? await IssueTracker.findByIdAndUpdate(existingTracker._id, { $set: trackerPayload }, { new: true, runValidators: true })
            : await IssueTracker.create(trackerPayload);

        return res.status(existingTracker ? 200 : 201).json(tracker);
    } catch (error) {
        console.error('Issue tracker create error:', error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'Issue not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const trackers = await IssueTracker.find({ user: req.user.id, active: true })
            .populate('repository', 'owner name ownerAvatarUrl githubUrl')
            .sort({ lastChecked: -1, createdAt: -1 })
            .lean();

        const lightweight = trackers.map((tracker) => ({
            _id: tracker._id,
            repository: tracker.repository,
            issueNumber: tracker.issueNumber,
            issueTitle: tracker.issueTitle,
            issueUrl: tracker.issueUrl,
            issueState: tracker.issueState,
            issueBodyPreview: tracker.issueBodyPreview,
            issueAuthor: tracker.issueAuthor,
            issueAuthorAvatar: tracker.issueAuthorAvatar,
            commentCount: tracker.commentCount,
            newCommentCount: tracker.newCommentCount,
            lastComment: tracker.comments?.length ? tracker.comments[tracker.comments.length - 1] : null,
            lastChecked: tracker.lastChecked,
            createdAt: tracker.createdAt
        }));

        res.json(lightweight);
    } catch (error) {
        console.error('Issue tracker list error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const tracker = await IssueTracker.findOne({ _id: req.params.id, user: req.user.id })
            .populate('repository', 'owner name ownerAvatarUrl githubUrl');

        if (!tracker) {
            return res.status(404).json({ message: 'Not found' });
        }

        tracker.lastSeenAt = new Date();
        tracker.newCommentCount = 0;
        await tracker.save();

        res.json(tracker);
    } catch (error) {
        console.error('Issue tracker get error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const tracker = await IssueTracker.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { active: false },
            { new: true }
        );

        if (!tracker) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({ message: 'Issue unfollowed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;