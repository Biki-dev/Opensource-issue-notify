const cron = require('node-cron');
const axios = require('axios');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getBestTokenForRepo } = require('../utils/githubHelpers');
const { sendPushNotification } = require('./pushNotifications');
const { issueMatchesSubscription, toLowercaseList } = require('../utils/subscriptionMatching');
/**
 * Check repositories for a specific tier
 */
const checkRepositoriesForTier = async (tierName, frequencyMinutes, options = {}) => {
    const { skipRateLimitSleep = false, requestTimeoutMs = 15000, forceCheck = false, backfill = false } = options;
    const now = new Date();

    try {
        // In checkRepositoriesForTier(), replace from the find() call through
        // the closing of the tierSubscriptions filter (roughly lines 18-70)

        const activeSubscriptions = await Subscription.find({ active: true })
            .populate('repository')
            .populate('user');

        const cutoffTime = new Date(now - frequencyMinutes * 60 * 1000);

        const tierSubscriptions = activeSubscriptions.filter(sub => {
            if (!sub.repository) return false;
            if (!sub.user) {
                console.warn(`⚠️  Subscription ${sub._id} has no user, skipping`);
                return false;
            }
            if (!sub.user.notificationsEnabled) return false;
            if (sub.muted) return false;

            if (tierName === 'personal' && sub.user.rateLimitTier !== 'personal') return false;
            if (tierName === 'premium' && sub.user.rateLimitTier !== 'premium') return false;
            if (tierName === 'default' && sub.user.rateLimitTier !== 'default') return false;

            if (!forceCheck) {
                const lc = sub.repository.lastChecked;
                if (lc && new Date(lc) > cutoffTime) return false;
            }

            return true;
        });

        if (tierSubscriptions.length === 0) return;
        console.log(`🔍 Checking ${tierSubscriptions.length} ${tierName} tier repos...`);
        
        // Group by repository
        const repoSubscriptionsMap = new Map();
        for (const sub of tierSubscriptions) {
            const repoId = sub.repository._id.toString();
            if (!repoSubscriptionsMap.has(repoId)) {
                repoSubscriptionsMap.set(repoId, {
                    repository: sub.repository,
                    subscriptions: [],
                    labelSet: new Set()
                });
            }
            const repoEntry = repoSubscriptionsMap.get(repoId);
            repoEntry.subscriptions.push(sub);
            for (const label of sub.labels || []) {
                if (label) {
                    repoEntry.labelSet.add(label);
                }
            }
        }

        // Process each repository
        for (const [repoId, { repository, subscriptions, labelSet }] of repoSubscriptionsMap.entries()) {
            const tokenResult = await getBestTokenForRepo(subscriptions);

            if (!tokenResult.hasToken) {
                console.warn(`⚠️  No auth token for ${repository.owner}/${repository.name} - using anonymous (60 req/hr limit)`);
            }

            // Only pass valid HTTP headers to axios.
            const headers = tokenResult.Authorization
                ? { Authorization: tokenResult.Authorization }
                : {};

            try {
                // 🆕 CRITICAL FIX: Limit pagination to prevent API abuse
                const MAX_PAGES = 3; // Only fetch 3 pages (300 issues max)
                const PER_PAGE = 100;
                const apiLabels = Array.from(labelSet);
                const queryParams = new URLSearchParams({
                    state: 'all',
                    per_page: String(PER_PAGE),
                    sort: 'created',
                    direction: 'desc'
                });

                if (apiLabels.length > 0) {
                    queryParams.set('labels', apiLabels.join(','));
                }

                let nextUrl = `https://api.github.com/repos/${repository.owner}/${repository.name}/issues?${queryParams.toString()}`;
                let allIssues = [];
                let pageCount = 0;

                // Add rate limit helper
                const checkWithRateLimit = async (url, headers) => {
                    const response = await axios.get(url, {
                        headers,
                        timeout: requestTimeoutMs
                    });
                    const remaining = parseInt(response.headers['x-ratelimit-remaining']);

                    if (remaining < 10) {
                        const resetTime = parseInt(response.headers['x-ratelimit-reset']) * 1000;
                        const waitTime = resetTime - Date.now();
                        const waitMin = Math.ceil(waitTime / 60000);
                        if (waitMin > 0 && !skipRateLimitSleep) {
                            console.warn(`   ⚠️ Rate limit low (${remaining}), waiting ${waitMin}min`);
                            await new Promise(r => setTimeout(r, waitTime + 1000));
                        } else if (waitMin > 0) {
                            console.warn(`   ⚠️ Rate limit low (${remaining}), skipping wait in manual check`);
                        }
                    }
                    return response;
                };

                while (nextUrl && pageCount < MAX_PAGES) {
                    const response = await checkWithRateLimit(nextUrl, headers);
                    const pageIssues = response.data;

                    if (pageIssues.length === 0) break;

                    // 🆕 OPTIMIZATION: Stop early if we see old issues
                    const hasOldIssue = !backfill && pageIssues.some(issue =>
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
                    console.log(`   ℹ️ No candidate issues fetched for ${repository.owner}/${repository.name}`);
                    repository.lastChecked = new Date();
                    await repository.save();
                    continue;
                }

                let maxIssueNumber = repository.latestIssueNumber || 0;
                const stats = {
                    fetched: issues.length,
                    oldSkipped: 0,
                    prSkipped: 0,
                    subscriptionChecks: 0,
                    matched: 0,
                    inserted: 0,
                    duplicates: 0,
                    pushSuccess: 0,
                    pushFailed: 0
                };

                // Process in chronological order
                for (const issue of issues.reverse()) {
                    // CRITICAL: Skip already processed issues unless we are backfilling
                    if (!backfill && issue.number <= repository.latestIssueNumber) {
                        stats.oldSkipped++;
                        continue;
                    }

                    // CRITICAL: Skip pull requests
                    if (issue.pull_request) {
                        stats.prSkipped++;
                        continue;
                    }

                    if (issue.number > maxIssueNumber) maxIssueNumber = issue.number;

                    // Create notifications for matching subscriptions
                    for (const sub of subscriptions) {
                        stats.subscriptionChecks++;
                        if (!issueMatchesSubscription(issue, sub)) continue;
                        stats.matched++;

                        const issueLabels = (issue.labels || []).map(l => l.name).filter(Boolean);
                        const subscriptionLabelSet = new Set(toLowercaseList(sub.labels));
                        const matchedLabels = issueLabels.filter(label =>
                            subscriptionLabelSet.has(label.toLowerCase())
                        );

                        // Use atomic upsert to prevent races between duplicate checks and insert.
                        const uniqueFilter = {
                            user: sub.user._id,
                            repository: repository._id,
                            issueUrl: issue.html_url
                        };

                        const writeResult = await Notification.updateOne(
                            uniqueFilter,
                            {
                                $setOnInsert: {
                                    user: sub.user._id,
                                    repository: repository._id,
                                    issueTitle: issue.title,
                                    issueUrl: issue.html_url,
                                    matchedLabels,
                                    isRead: false
                                }
                            },
                            { upsert: true }
                        );

                        const createdNow = Number(writeResult.upsertedCount || 0) > 0;
                        if (!createdNow) {
                            stats.duplicates++;
                            continue;
                        }

                        let notificationId = writeResult.upsertedId && (writeResult.upsertedId._id || writeResult.upsertedId);
                        if (!notificationId) {
                            const insertedNotification = await Notification.findOne(uniqueFilter)
                                .select('_id')
                                .lean();
                            notificationId = insertedNotification?._id || null;
                        }

                        stats.inserted++;

                        console.log(`✓ Notify user for issue #${issue.number}`);
                        console.log(`  👤 User: ${sub.user.email || sub.user._id}`);
                        console.log(`  📖 Issue: ${issue.title}`);

                        // ✅ DETAILED push notification attempt
                        try {
                            const pushResult = await sendPushNotification(sub.user._id, {
                                _id: notificationId,
                                issueTitle: issue.title,
                                issueUrl: issue.html_url,
                                matchedLabels,
                                repository: {
                                    owner: repository.owner,
                                    name: repository.name
                                }
                            });

                            // ✅ LOG result
                            if (pushResult.success) {
                                stats.pushSuccess++;
                                console.log(`     ✅ Push sent successfully!`);
                            } else {
                                stats.pushFailed++;
                                console.error(`     ❌ Push failed: ${pushResult.reason}`);
                                if (pushResult.error) {
                                    console.error(`        Error: ${pushResult.error}`);
                                }
                            }
                        } catch (pushError) {
                            stats.pushFailed++;
                            console.error(`     ❌ Push error:`, pushError.message);
                            console.error(`        Stack:`, pushError.stack); // ✅ Full stack trace
                        }
                    }
                }

                console.log(
                    `   📈 ${repository.owner}/${repository.name} summary | fetched=${stats.fetched} oldSkipped=${stats.oldSkipped} prSkipped=${stats.prSkipped} checks=${stats.subscriptionChecks} matched=${stats.matched} inserted=${stats.inserted} duplicates=${stats.duplicates} pushOk=${stats.pushSuccess} pushFail=${stats.pushFailed}`
                );

                repository.latestIssueNumber = maxIssueNumber;
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
    const isDebugScheduler = process.env.SCHEDULER_DEBUG === 'true';
    const tierConfig = {
        default: { cron: isDebugScheduler ? '* * * * *' : '0 * * * *', frequencyMinutes: isDebugScheduler ? 1 : 60 },
        personal: { cron: isDebugScheduler ? '* * * * *' : '*/30 * * * *', frequencyMinutes: isDebugScheduler ? 1 : 30 },
        premium: { cron: isDebugScheduler ? '* * * * *' : '*/15 * * * *', frequencyMinutes: isDebugScheduler ? 1 : 15 }
    };

    const scheduleTier = (tierName) => {
        const { cron: cronExpression, frequencyMinutes } = tierConfig[tierName];
        cron.schedule(cronExpression, () => {
            const modeLabel = isDebugScheduler ? 'DEBUG' : 'PROD';
            console.log(`🔍 [${modeLabel}] ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} Tier Check (${frequencyMinutes}min)`);
            checkRepositoriesForTier(tierName, frequencyMinutes);
        });
    };

    scheduleTier('default');
    scheduleTier('personal');
    scheduleTier('premium');

    // Run initial checks after 10 seconds
    setTimeout(() => {
        console.log('⏳ Running initial checks...');
        checkRepositoriesForTier('default', tierConfig.default.frequencyMinutes);
        checkRepositoriesForTier('personal', tierConfig.personal.frequencyMinutes);
        checkRepositoriesForTier('premium', tierConfig.premium.frequencyMinutes);
    }, 10000);

    console.log('📅 Multi-Tier Scheduler Started');
};

// Legacy function for backwards compatibility
const checkIssues = async (options = {}) => {
    const { backfill = false } = options;
    console.log('🔍 Manual check triggered...');
    await checkRepositoriesForTier('default', 60, { skipRateLimitSleep: true, forceCheck: true, backfill });
    await checkRepositoriesForTier('personal', 30, { skipRateLimitSleep: true, forceCheck: true, backfill });
    await checkRepositoriesForTier('premium', 15, { skipRateLimitSleep: true, forceCheck: true, backfill });
};

module.exports = { startScheduler, checkIssues };
