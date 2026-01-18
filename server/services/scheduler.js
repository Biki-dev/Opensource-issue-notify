const cron = require('node-cron');
const axios = require('axios');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getBestTokenForRepo } = require('../utils/githubHelpers');
const { sendPushNotification } = require('./pushNotifications');
/**
 * Check repositories for a specific tier
 */
const checkRepositoriesForTier = async (tierName, frequencyMinutes) => {
    const now = new Date();
    const cutoffTime = new Date(now - frequencyMinutes * 60 * 1000);

    try {
        // Find subscriptions that belong to this tier
        // IMPORTANT: Only fetch ACTIVE subscriptions
        const activeSubscriptions = await Subscription.find({ 
            active: true  // ✅ This filters out logged-out users
        })
            .populate({
                path: 'repository',
                match: { 
                    $or: [
                        { lastChecked: { $lt: cutoffTime } },
                        { lastChecked: null }
                    ]
                }
            })
            .populate('user', 'email notificationsEnabled personalGitHubToken tokenIsValid rateLimitTier expoPushToken deviceInfo');

        // Additional safety checks
        const tierSubscriptions = activeSubscriptions.filter(sub => {
            // Skip if repository doesn't exist (was deleted)
            if (!sub.repository) {
                console.warn(`⚠️  Subscription ${sub._id} has no repository, skipping...`);
                return false;
            }
            
            // Skip if user doesn't exist (was deleted)
            if (!sub.user) {
                console.warn(`⚠️  Subscription ${sub._id} has no user, skipping...`);
                return false;
            }
            
            // Skip if user has notifications disabled
            if (!sub.user.notificationsEnabled) {
                console.log(`ℹ️  User ${sub.user._id} has notifications disabled, skipping...`);
                return false;
            }
            
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

            try {
                // 🆕 CRITICAL FIX: Limit pagination to prevent API abuse
                const MAX_PAGES = 3; // Only fetch 3 pages (300 issues max)
                const PER_PAGE = 100;
                
                let nextUrl = `https://api.github.com/repos/${repository.owner}/${repository.name}/issues?state=all&per_page=${PER_PAGE}&sort=created&direction=desc`;
                let allIssues = [];
                let pageCount = 0;
                
                while (nextUrl && pageCount < MAX_PAGES) {
                    const response = await axios.get(nextUrl, { headers });
                    const pageIssues = response.data;

                    if (pageIssues.length === 0) break;

                    // 🆕 OPTIMIZATION: Stop early if we see old issues
                    const hasOldIssue = pageIssues.some(issue => 
                        issue.number <= repository.latestIssueNumber
                    );
                    
                    if (hasOldIssue) {
                        // Only add new issues from this page
                        const newIssues = pageIssues.filter(issue => 
                            issue.number > repository.latestIssueNumber
                        );
                        allIssues = allIssues.concat(newIssues);
                        console.log(`   ✓ Found boundary at page ${pageCount + 1}, stopping pagination`);
                        break;
                    }

                    allIssues = allIssues.concat(pageIssues);
                    pageCount++;

                    // Log rate limit
                    const remaining = response.headers['x-ratelimit-remaining'];
                    if (remaining) {
                        console.log(`   📊 Page ${pageCount}/${MAX_PAGES} | Rate limit: ${remaining}`);
                    }

                    // Check for next page
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

                if (pageCount >= MAX_PAGES && nextUrl) {
                    console.warn(`⚠️  Stopped at ${MAX_PAGES} pages for ${repository.owner}/${repository.name}`);
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
                                const notification = await Notification.create({
                                    user: sub.user._id,
                                    repository: repository._id,
                                    issueTitle: issue.title,
                                    issueUrl: issue.html_url,
                                    matchedLabels: matchedLabels,
                                    isRead: false
                                });

                                console.log(`✓ Notify user for issue #${issue.number}`);
                                console.log(`  📬 Notification ID: ${notification._id}`);
                                console.log(`  👤 User ID: ${sub.user._id}`);
                                console.log(`  📧 User Email: ${sub.user.email || 'unknown'}`);
                                console.log(`  📖 Issue: ${issue.title}`);
                                console.log(`  🔔 Has Push Token: ${!!sub.user.expoPushToken}`);
                                console.log(`  📱 Device: ${sub.user.deviceInfo?.platform || 'unknown'}`);
                                
                                // 🔍 DEBUG: Log populated user data
                                if (sub.user && sub.user._id) {
                                    console.log(`  🔍 DEBUG - User populated:`, {
                                        userId: sub.user._id.toString(),
                                        hasExpoToken: !!sub.user.expoPushToken,
                                        expoTokenValue: sub.user.expoPushToken ? `${sub.user.expoPushToken.substring(0, 30)}...` : 'null/undefined',
                                        notificationsEnabled: sub.user.notificationsEnabled,
                                        rateLimitTier: sub.user.rateLimitTier
                                    });
                                } else {
                                    console.error(`  ❌ DEBUG - User NOT populated properly!`);
                                }

                                // Send push notification (non-blocking)
                                try {
                                    console.log(`  📤 About to call sendPushNotification for user: ${sub.user._id}`);
                                    const pushResult = await sendPushNotification(sub.user._id, {
                                        _id: notification._id,
                                        issueTitle: issue.title,
                                        issueUrl: issue.html_url,
                                        matchedLabels: matchedLabels,
                                        repository: {
                                            owner: repository.owner,
                                            name: repository.name
                                        }
                                    });
                                    if (pushResult.success) {
                                        console.log(`   ✅ Push delivered successfully`);
                                    } else {
                                        console.warn(`   ⚠️  Push failed: ${pushResult.reason}`);
                                    }
                                } catch (pushError) {
                                    console.error(`   ❌ Push error for user ${sub.user._id}:`, pushError.message);
                                }                            
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

    // Default tier: Every 5 minutes (testing)
    cron.schedule('*/5 * * * *', () => {
        console.log('🔍 Default Tier Check (5min)');
        checkRepositoriesForTier('default', 5);
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
