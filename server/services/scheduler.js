const cron = require('node-cron');
const axios = require('axios');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');

const checkIssues = async () => {
    console.log('Running Scheduled Check...');
    try {
        // Only check repositories that have at least one ACTIVE subscription.
        const activeRepoIds = await Subscription.distinct('repository', { active: true });
        if (!activeRepoIds || activeRepoIds.length === 0) {
            console.log('No active subscriptions found. Skipping check.');
            return;
        }

        const repositories = await Repository.find({ _id: { $in: activeRepoIds } });
        for (const repo of repositories) {
            // Optimization: if no active subscriptions, skip?
            // For now, check all.

            const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

            // Fetch issues created since last check
            // Actually, querying by issue number is safer than time if we track latest number.
            // But GitHub API "since" parameter is time-based. "state=open"
            // Let's use `since` timestamp if available, else just check recent.

            const sinceQuery = repo.lastChecked ? `&since=${repo.lastChecked.toISOString()}` : '';
            const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/issues?state=all&per_page=50${sinceQuery}`;

            try {
                const response = await axios.get(url, { headers });
                const issues = response.data;

                if (issues.length === 0) {
                    console.log(`No new issues for ${repo.owner}/${repo.name}`);
                    continue;
                }

                // Get all subscriptions for this repo
                const subscriptions = await Subscription.find({ repository: repo._id, active: true });
                if (subscriptions.length === 0) continue;

                // Optimize: Map labels to users
                // Issue: { labels: [{name: 'bug'}] }
                // Sub: { labels: ['bug'] }

                let maxIssueNumber = repo.latestIssueNumber;

                for (const issue of issues) {
                    if (issue.number <= repo.latestIssueNumber) continue; // Skip old ones if API returns them
                    if (issue.number > maxIssueNumber) maxIssueNumber = issue.number;

                    const issueLabels = issue.labels.map(l => l.name);

                    for (const sub of subscriptions) {
                        const matched = issueLabels.filter(label => sub.labels.includes(label));
                        if (matched.length > 0) {
                            // Create Notification
                            await Notification.create({
                                user: sub.user,
                                repository: repo._id,
                                issueTitle: issue.title,
                                issueUrl: issue.html_url,
                                matchedLabels: matched
                            });
                            console.log(`Notify user ${sub.user} for issue ${issue.number}`);
                        }
                    }
                }

                // Update Repo State
                repo.lastChecked = new Date();
                repo.latestIssueNumber = maxIssueNumber;
                await repo.save();

            } catch (err) {
                console.error(`Error fetching ${repo.owner}/${repo.name}: ${err.message}`);
            }
        }
    } catch (error) {
        console.error('Cron Job Error:', error);
    }
};

// Schedule: Run every 60 minutes
const startScheduler = () => {
    cron.schedule('0 * * * *', checkIssues);
    // cron.schedule('* * * * *', checkIssues); // Debug: every minute
    console.log('Issue Checker Scheduler Started (Every 60 mins)');
};

module.exports = { startScheduler, checkIssues };
