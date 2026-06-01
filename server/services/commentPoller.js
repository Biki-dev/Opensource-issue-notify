const cron = require('node-cron');
const axios = require('axios');
const IssueTracker = require('../models/IssueTracker');
const { getBestTokenForRepo } = require('../utils/githubHelpers');
const { sendPushNotification } = require('./pushNotifications');

const githubConfig = (authorization) => ({
    headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'IssueWatch-App',
        ...(authorization ? { Authorization: authorization } : {})
    },
    timeout: 10000
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

const mapComment = (comment) => ({
    githubCommentId: comment.id,
    author: comment.user?.login || 'unknown',
    authorAvatar: comment.user?.avatar_url || null,
    body: (comment.body || '').substring(0, 2000),
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

const pollComments = async () => {
    console.log('💬 Polling tracked issues for new comments...');

    try {
        const isDebugScheduler = process.env.SCHEDULER_DEBUG === 'true';
        const frequencyMinutes = isDebugScheduler ? 1 : 30;
        const cutoff = new Date(Date.now() - frequencyMinutes * 60 * 1000);
        const trackers = await IssueTracker.find({
            active: true,
            $or: [{ lastChecked: { $lt: cutoff } }, { lastChecked: null }]
        })
            .populate('repository')
            .populate('user', 'notificationsEnabled email')
            .lean();

        if (trackers.length === 0) {
            console.log('   ✅ No tracked issues due for check');
            return;
        }

        console.log(`   📋 Checking ${trackers.length} tracked issues`);

        for (const tracker of trackers) {
            if (!tracker.repository || !tracker.user || !tracker.user.notificationsEnabled) {
                continue;
            }

            try {
                const tokenResult = await getBestTokenForRepo([{ user: tracker.user }]);
                const headers = tokenResult.Authorization ? { Authorization: tokenResult.Authorization } : {};
                const { owner, name } = tracker.repository;
                const issueUrl = `https://api.github.com/repos/${owner}/${name}/issues/${tracker.issueNumber}`;
                const commentsUrl = `https://api.github.com/repos/${owner}/${name}/issues/${tracker.issueNumber}/comments?per_page=100&sort=created&direction=desc`;

                const [issueRes, commentsRes] = await Promise.all([
                    axios.get(issueUrl, githubConfig(headers.Authorization)),
                    axios.get(commentsUrl, githubConfig(headers.Authorization))
                ]);

                const issue = issueRes.data;
                const rawComments = commentsRes.data || [];
                const newComments = rawComments.filter((comment) => comment.id > tracker.lastCommentId);
                const stateChanged = issue.state !== tracker.issueState;

                if (newComments.length === 0 && !stateChanged) {
                    await IssueTracker.findByIdAndUpdate(tracker._id, {
                        lastChecked: new Date(),
                        commentCount: issue.comments,
                        issueState: issue.state
                    });
                    continue;
                }

                const formattedNew = newComments.map(mapComment).reverse();
                const newestCommentId = newComments.length > 0
                    ? Math.max(...newComments.map((comment) => comment.id))
                    : tracker.lastCommentId;

                const shouldNotifyOnClose = stateChanged && issue.state === 'closed' && tracker.notifyOnClose !== false;
                const latestComment = newComments[0];
                const isMaintainerComment = latestComment
                    ? ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(latestComment.author_association)
                    : false;

                let shouldPush = false;
                let pushTitle = '';
                let pushBody = '';

                if (shouldNotifyOnClose) {
                    shouldPush = true;
                    pushTitle = 'Issue closed';
                    pushBody = tracker.issueTitle;
                } else if (newComments.length > 0) {
                    shouldPush = tracker.notifyOnMaintainerOnly
                        ? isMaintainerComment
                        : tracker.notifyOnAnyComment !== false;

                    if (shouldPush) {
                        pushTitle = `${isMaintainerComment ? '⭐' : '💬'} ${latestComment.user?.login || 'Someone'} commented`;
                        pushBody = toPlainText(latestComment.body || '');
                    }
                }

                await IssueTracker.findByIdAndUpdate(tracker._id, {
                    $push: {
                        comments: {
                            $each: formattedNew,
                            $slice: -100
                        }
                    },
                    $set: {
                        lastChecked: new Date(),
                        lastCommentId: newestCommentId,
                        commentCount: issue.comments,
                        issueState: issue.state,
                        newCommentCount: (tracker.newCommentCount || 0) + newComments.length
                    }
                });

                if (shouldPush) {
                    await sendPushNotification(tracker.user._id, {
                        issueTitle: tracker.issueTitle,
                        issueUrl: tracker.issueUrl,
                        matchedLabels: [],
                        repository: { owner, name },
                        pushTitle,
                        pushBody,
                        data: {
                            type: shouldNotifyOnClose ? 'issue_closed' : 'issue_comment',
                            trackerId: tracker._id.toString(),
                            issueUrl: tracker.issueUrl
                        }
                    });

                    console.log(`   💬 Pushed issue update for ${tracker.user.email}`);
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    await IssueTracker.findByIdAndUpdate(tracker._id, { active: false });
                    console.warn(`   ⚠️  Issue ${tracker.issueUrl} not found — deactivated tracker`);
                } else {
                    console.error(`   ❌ Error polling issue ${tracker.issueNumber}:`, error.message);
                }
            }
        }

        console.log('   ✅ Comment polling complete');
    } catch (error) {
        console.error('❌ Comment poller failed:', error.message);
    }
};

const startCommentPoller = () => {
    const isDebugScheduler = process.env.SCHEDULER_DEBUG === 'true';
    const cronExpression = isDebugScheduler ? '* * * * *' : '*/30 * * * *';

    cron.schedule(cronExpression, pollComments);
    console.log(`📅 Comment poller scheduled (${isDebugScheduler ? 'every 1 minute' : 'every 30 minutes'})`);
};

module.exports = { startCommentPoller, pollComments };