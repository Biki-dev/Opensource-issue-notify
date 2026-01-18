const cron = require('node-cron');
const axios = require('axios');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getBestTokenForRepo } = require('../utils/githubHelpers');
/**
 * Check repositories for a specific tier
 */
const checkRepositoriesForTier = async (tierName, frequencyMinutes) => {
    const now = new Date();
    const cutoffTime = new Date(now - frequencyMinutes * 60 * 1000);

    try {
        // Find subscriptions that belong to this tier
        const activeSubscriptions = await Subscription.find({ active: true })
            .populate({
                path: 'repository',
                match: { 
                    $or: [
                        { lastChecked: { $lt: cutoffTime } },
                        { lastChecked: null }
                    ]
                }
            })
            .populate('user', 'notificationsEnabled personalGitHubToken tokenIsValid rateLimitTier');

        // Filter by tier and valid users
        const tierSubscriptions = activeSubscriptions.filter(sub => {
            if (!sub.repository || !sub.user?.notificationsEnabled) return false;
            
            // Skip if user has deactivated (no active subscriptions should exist for deleted users)
            if (!sub.user) return false;
            
            // Check if user tier matches
            if (tierName === 'personal' && sub.user.rateLimitTier !== 'personal') return false;
            if (tierName === 'premium' && sub.user.rateLimitTier !== 'premium') return false;
            if (tierName === 'default' && sub.user.rateLimitTier !== 'default') return false;
            
            return true;
        });

        if (tierSubscriptions.length === 0) {
            console.log(`✓ No ${tierName} tier repos to check`);
            return;
        }

        console.log(`🔍 Checking ${tierSubscriptions.length} ${tierName} tier repos...`);

        // Group by repository
        const repoSubscriptionsMap = new Map();
        for (const sub of tierSubscriptions) {
            const repoId = sub.repository._id.toString();
            if (!repoSubscriptionsMap.has(repoId)) {
                repoSubscriptionsMap.set(repoId, {
                    repository: sub.repository,
                    subscriptions: []
                });
            }
            repoSubscriptionsMap.get(repoId).subscriptions.push(sub);
        }

        // Process each repository
        for (const [repoId, { repository, subscriptions }] of repoSubscriptionsMap.entries()) {
            const headers = await getBestTokenForRepo(subscriptions);
            
            if (!headers.Authorization && headers.source === 'none') {
                console.warn(`⚠️ No token available for ${repository.owner}/${repository.name}`);
            }

            let nextUrl = `https://api.github.com/repos/${repository.owner}/${repository.name}/issues?state=all&per_page=100&sort=created&direction=desc`;
            let allIssues = [];
            
            try {
                // Fetch all paginated results
                while (nextUrl) {
                    const response = await axios.get(nextUrl, { headers });
                    const pageIssues = response.data;

                    if (pageIssues.length === 0) {
                        break;
                    }

                    // Aggregate issues from this page
                    allIssues = allIssues.concat(pageIssues);

                    // Log rate limit info if available
                    const remaining = response.headers['x-ratelimit-remaining'];
                    if (remaining) {
                        console.log(`   Rate limit remaining: ${remaining}`);
                    }

                    // Check for next page in Link header
                    const linkHeader = response.headers.link;
                    nextUrl = null; // Default to no next page

                    if (linkHeader) {
                        // Parse Link header for next page URL
                        // Format: <url>; rel="next", <url>; rel="last"
                        const links = linkHeader.split(',');
                        for (const link of links) {
                            if (link.includes('rel="next"')) {
                                const match = link.match(/<([^>]+)>/);
                                if (match) {
                                    nextUrl = match[1];
                                    console.log(`   📄 Fetching next page...`);
                                    break;
                                }
                            }
                        }
                    }
                }

                const issues = allIssues;

                if (issues.length === 0) {
                    repository.lastChecked = new Date();
                    await repository.save();
                    continue;
                }

                let maxIssueNumber = repository.latestIssueNumber || 0;

                // Process in chronological order
                for (const issue of issues.reverse()) {
                    // CRITICAL: Skip already processed issues
                    if (issue.number <= repository.latestIssueNumber) continue;
                    
                    // CRITICAL: Skip pull requests
                    if (issue.pull_request) continue;

                    const issueLabels = (issue.labels || []).map(l => l.name);
                    if (issue.number > maxIssueNumber) maxIssueNumber = issue.number;

                    // Create notifications for matching subscriptions
                    for (const sub of subscriptions) {
                        const matchedLabels = issueLabels.filter(label => 
                            sub.labels.includes(label)
                        );

                        if (matchedLabels.length > 0) {
                            // CRITICAL: Prevent duplicates
                            const exists = await Notification.findOne({
                                user: sub.user._id,
                                repository: repository._id,
                                issueUrl: issue.html_url
                            });

                            if (!exists) {
                                await Notification.create({
                                    user: sub.user._id,
                                    repository: repository._id,
                                    issueTitle: issue.title,
                                    issueUrl: issue.html_url,
                                    matchedLabels: matchedLabels,
                                    isRead: false
                                });
                                console.log(`✓ Notify user for issue #${issue.number}`);
                            }
                        }
                    }
                }

                repository.lastChecked = new Date();
                await repository.save();

            } catch (err) {
                if (err.response?.status === 403) {
                    console.error('   Rate limit exceeded');
                }
            }
        }
    } catch (error) {
        console.error(`❌ Tier Check Error (${tierName}):`, error.message);
    }
};

/**
 * Start the tiered scheduler
 */
const startScheduler = () => {
    // Personal tier: Every 30 minutes
    cron.schedule('*/30 * * * *', () => {
        console.log('🔍 Personal Tier Check (30min)');
        checkRepositoriesForTier('personal', 30);
    });

    // Default tier: Every 60 minutes
    cron.schedule('0 * * * *', () => {
        console.log('🔍 Default Tier Check (60min)');
        checkRepositoriesForTier('default', 60);
    });

    // Premium tier: Every 15 minutes (future feature)
    cron.schedule('*/15 * * * *', () => {
        console.log('🔍 Premium Tier Check (15min)');
        checkRepositoriesForTier('premium', 15);
    });

    // Run initial checks after 10 seconds
    setTimeout(() => {
        console.log('⏳ Running initial checks...');
        checkRepositoriesForTier('default', 60);
        checkRepositoriesForTier('personal', 30);
        checkRepositoriesForTier('premium', 15);
    }, 10000);

    console.log('📅 Multi-Tier Scheduler Started');
};

// Legacy function for backwards compatibility
const checkIssues = async () => {
    console.log('🔍 Manual check triggered...');
    await checkRepositoriesForTier('default', 60);
    await checkRepositoriesForTier('personal', 30);
    await checkRepositoriesForTier('premium', 15);
};

module.exports = { startScheduler, checkIssues };
