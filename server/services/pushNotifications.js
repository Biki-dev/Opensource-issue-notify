const { Expo } = require('expo-server-sdk');
const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { mergeExpoPushTokens, normalizeExpoPushTokens } = require('../utils/expoPushTokens');

// Create Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a user when a new issue matches their subscription
 * @param {string} userId - MongoDB user ID
 * @param {object} notification - Notification data with issueTitle, issueUrl, repository, matchedLabels
 * @param {number} retries - Number of retry attempts (default 2)
 * @returns {Promise<{success: boolean, reason?: string, ticket?: object, error?: string}>}
 */
const sendPushNotification = async (userId, notification, retries = 2) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`\n🔔 === PUSH NOTIFICATION ATTEMPT ${attempt}/${retries} ===`);
            console.log(`   User ID: ${userId}`);

            const user = await User.findById(userId).select('expoPushTokens expoPushToken notificationsEnabled deviceInfo email');

            if (!user) {
                console.error(`   ❌ User not found`);
                return { success: false, reason: 'user_not_found' };
            }

            console.log(`   User Email: ${user.email}`);
            console.log(`   Notifications Enabled: ${user.notificationsEnabled}`);
            const expoPushTokens = mergeExpoPushTokens(user.expoPushTokens, user.expoPushToken);
            console.log(`   Has Token: ${expoPushTokens.length > 0}`);
            console.log(`   Platform: ${user.deviceInfo?.platform || 'unknown'}`);

            if (!user.notificationsEnabled) {
                console.error(`   ❌ Notifications disabled by user`);
                return { success: false, reason: 'notifications_disabled' };
            }

            if (expoPushTokens.length === 0) {
                console.error(`   ❌ No push token registered`);
                return { success: false, reason: 'no_token' };
            }

            const validTokens = expoPushTokens.filter(token => Expo.isExpoPushToken(token));

            if (validTokens.length === 0) {
                console.error(`   ❌ No valid Expo push tokens found`);
                return { success: false, reason: 'invalid_token' };
            }

            console.log(`   Token Count: ${validTokens.length}`);

            const messages = validTokens.map(token => ({
                to: token,
                sound: 'default',
                title: '🔔 New Issue Matched!',
                body: notification.issueTitle || 'New issue matched your subscription',
                data: {
                    type: 'new_issue',
                    notificationId: notification._id?.toString(),
                    issueUrl: notification.issueUrl,
                    repositoryName: `${notification.repository.owner}/${notification.repository.name}`,
                    labels: notification.matchedLabels || []
                },
                badge: 1,
                priority: 'high',
                vibrate: true,
                channelId: 'default',
                categoryIdentifier: 'new_issue'
            }));

            const ticketRecords = [];
            let hasSuccess = false;
            let lastError = null;

            console.log(`   📤 Sending to Expo...`);
            const chunks = expo.chunkPushNotifications(messages);

            for (const chunk of chunks) {
                const chunkTickets = await expo.sendPushNotificationsAsync(chunk);

                chunkTickets.forEach((ticket, index) => {
                    const token = chunk[index]?.to;
                    ticketRecords.push({
                        token,
                        ticketId: ticket.id || null,
                        status: ticket.status === 'ok' ? 'pending' : 'error',
                        error: ticket.status === 'error' ? ticket.message || null : null,
                        checkedAt: null
                    });

                    console.log(`   📨 Expo Response [${token?.substring(0, 20) || 'unknown'}...]:`, ticket);

                    if (ticket.status === 'ok') {
                        hasSuccess = true;
                        return;
                    }

                    lastError = ticket.message || `Unexpected status: ${ticket.status}`;

                    if (ticket.details?.error === 'DeviceNotRegistered' && token) {
                        console.error(`   ⚠️  Device not registered - clearing token ${token.substring(0, 20)}...`);
                    }
                });
            }

            if (ticketRecords.length === 0) {
                return { success: false, reason: 'no_tickets', error: 'No push tickets returned by Expo' };
            }

            if (notification?._id && mongoose.isValidObjectId(notification._id)) {
                await Notification.findByIdAndUpdate(notification._id, {
                    pushTickets: ticketRecords,
                    pushTicketId: ticketRecords[0]?.ticketId || null,
                    pushTicketStatus: hasSuccess ? 'pending' : 'error',
                    pushTicketError: hasSuccess ? null : lastError,
                    pushTicketCheckedAt: null
                }).catch(error => {
                    console.warn(`   ⚠️ Failed to store push ticket metadata: ${error.message}`);
                });
            }

            for (const record of ticketRecords) {
                if (record.status === 'error' && record.error === 'DeviceNotRegistered' && record.token) {
                    await User.findByIdAndUpdate(userId, {
                        $pull: { expoPushTokens: record.token }
                    });

                    const refreshedUser = await User.findById(userId).select('expoPushTokens');
                    const remainingTokens = normalizeExpoPushTokens(refreshedUser?.expoPushTokens);

                    await User.findByIdAndUpdate(userId, {
                        $set: {
                            expoPushToken: remainingTokens[0] || null
                        }
                    });
                }
            }

            if (!hasSuccess) {
                return { success: false, error: lastError || 'All push deliveries failed' };
            }

            console.log(`   ✅ Push notification sent to ${ticketRecords.length} device(s)`);
            return { success: true, tickets: ticketRecords };

        } catch (error) {
            console.error(`\n❌ === PUSH NOTIFICATION ERROR (Attempt ${attempt}) ===`);
            console.error(`   User: ${userId}`);
            console.error(`   Error: ${error.message}`);

            if (attempt === retries) {
                console.error(`   Stack:`, error.stack);
                return { success: false, error: error.message };
            }

            console.log(`   ⚠️  Retrying in ${attempt}s...`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
};

/**
 * Verify push notification receipts
 * @param {string[]} ticketIds 
 */
const verifyPushReceipts = async (ticketIds) => {
    if (!ticketIds || ticketIds.length === 0) {
        return;
    }

    try {
        const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

        for (const chunk of receiptIdChunks) {
            const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

            for (const [ticketId, receipt] of Object.entries(receipts)) {
                const notification = await Notification.findOne({
                    pushTickets: { $elemMatch: { ticketId, status: 'pending' } }
                }).select('user pushTicketId pushTickets');

                if (!notification) {
                    continue;
                }

                const ticketEntry = notification.pushTickets?.find(ticket => ticket.ticketId === ticketId);

                if (receipt.status === 'ok') {
                    await Notification.findByIdAndUpdate(notification._id, {
                        $set: {
                            'pushTickets.$[ticket].status': 'ok',
                            'pushTickets.$[ticket].error': null,
                            'pushTickets.$[ticket].checkedAt': new Date(),
                            pushTicketStatus: 'ok',
                            pushTicketError: null,
                            pushTicketCheckedAt: new Date()
                        }
                    }, {
                        arrayFilters: [{ 'ticket.ticketId': ticketId }]
                    });
                    continue;
                }

                const receiptError = receipt.details?.error || receipt.message || 'Unknown receipt error';

                await Notification.findByIdAndUpdate(notification._id, {
                    $set: {
                        'pushTickets.$[ticket].status': 'error',
                        'pushTickets.$[ticket].error': receiptError,
                        'pushTickets.$[ticket].checkedAt': new Date(),
                        pushTicketStatus: 'error',
                        pushTicketError: receiptError,
                        pushTicketCheckedAt: new Date()
                    }
                }, {
                    arrayFilters: [{ 'ticket.ticketId': ticketId }]
                });

                if (receipt.details?.error === 'DeviceNotRegistered' && ticketEntry?.token) {
                    console.error(`   ⚠️ Receipt says device is not registered, clearing token for user ${notification.user}`);
                    await User.findByIdAndUpdate(notification.user, {
                        $pull: { expoPushTokens: ticketEntry.token }
                    });

                    const refreshedUser = await User.findById(notification.user).select('expoPushTokens');
                    const remainingTokens = normalizeExpoPushTokens(refreshedUser?.expoPushTokens);

                    await User.findByIdAndUpdate(notification.user, {
                        $set: {
                            expoPushToken: remainingTokens[0] || null
                        }
                    });
                } else {
                    console.error(`   ❌ Push receipt error for ${ticketId}: ${receiptError}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Receipt verification failed:', error.message);
    }
};

const getPushReceipts = async (ticketIds) => {
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
        return {};
    }

    const receiptMap = {};
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

    for (const chunk of receiptIdChunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        Object.assign(receiptMap, receipts);
    }

    return receiptMap;
};

/**
 * Start scheduled receipt verification
 */
const startPushReceiptVerificationJob = () => {
    cron.schedule('*/15 * * * *', async () => {
        console.log('🧾 Checking push notification receipts...');

        try {
            const pendingNotifications = await Notification.find({
                pushTickets: { $elemMatch: { status: 'pending', ticketId: { $ne: null } } }
            })
                .select('pushTicketId pushTickets')
                .limit(300);

            const ticketIds = pendingNotifications
                .flatMap(notification => (notification.pushTickets || [])
                    .filter(ticket => ticket.status === 'pending' && ticket.ticketId)
                    .map(ticket => ticket.ticketId))
                .filter(Boolean);

            if (ticketIds.length === 0) {
                console.log('   ✅ No pending push receipts to verify');
                return;
            }

            await verifyPushReceipts(ticketIds);
        } catch (error) {
            console.error('❌ Receipt job failed:', error.message);
        }
    });

    console.log('📅 Push receipt verification job scheduled (every 15 minutes)');
};

module.exports = {
    sendPushNotification,
    verifyPushReceipts,
    getPushReceipts,
    startPushReceiptVerificationJob
};
