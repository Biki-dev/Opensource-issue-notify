const { Expo } = require('expo-server-sdk');
const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');

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

            const user = await User.findById(userId).select('expoPushToken notificationsEnabled deviceInfo email');

            if (!user) {
                console.error(`   ❌ User not found`);
                return { success: false, reason: 'user_not_found' };
            }

            console.log(`   User Email: ${user.email}`);
            console.log(`   Notifications Enabled: ${user.notificationsEnabled}`);
            console.log(`   Has Token: ${!!user.expoPushToken}`);
            console.log(`   Platform: ${user.deviceInfo?.platform || 'unknown'}`);

            if (!user.notificationsEnabled) {
                console.error(`   ❌ Notifications disabled by user`);
                return { success: false, reason: 'notifications_disabled' };
            }

            if (!user.expoPushToken) {
                console.error(`   ❌ No push token registered`);
                return { success: false, reason: 'no_token' };
            }

            if (!Expo.isExpoPushToken(user.expoPushToken)) {
                console.error(`   ❌ Invalid token format: ${user.expoPushToken}`);
                return { success: false, reason: 'invalid_token' };
            }

            console.log(`   Token: ${user.expoPushToken.substring(0, 30)}...`);

            const message = {
                to: user.expoPushToken,
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
                vibrate: true, // ✅ Force vibration/heads-up
                channelId: 'default',
                categoryIdentifier: 'new_issue' // ✅ Link to custom actions
            };

            console.log(`   📤 Sending to Expo...`);
            const chunks = expo.chunkPushNotifications([message]);
            const tickets = await expo.sendPushNotificationsAsync(chunks[0]);
            const ticket = tickets[0];

            console.log(`   📨 Expo Response:`, ticket);

            if (ticket.status === 'error') {
                console.error(`   ❌ Expo error: ${ticket.message}`);

                // ✅ Handle specific error types
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    console.error(`   ⚠️  Device not registered - clearing token`);
                    await User.findByIdAndUpdate(userId, { expoPushToken: null });
                    return { success: false, reason: 'device_not_registered', error: ticket.message };
                }

                throw new Error(`Expo error: ${ticket.message}`);
            }

            if (ticket.status === 'ok') {
                console.log(`   ✅ Push notification sent successfully!`);
                console.log(`   📮 Ticket ID: ${ticket.id}`);

                if (notification?._id && mongoose.isValidObjectId(notification._id)) {
                    await Notification.findByIdAndUpdate(notification._id, {
                        pushTicketId: ticket.id || null,
                        pushTicketStatus: 'pending',
                        pushTicketError: null,
                        pushTicketCheckedAt: null
                    }).catch(error => {
                        console.warn(`   ⚠️ Failed to store push ticket metadata: ${error.message}`);
                    });
                }

                return { success: true, ticket };
            }

            console.error(`   ⚠️  Unexpected ticket status: ${ticket.status}`);
            throw new Error(`Unexpected status: ${ticket.status}`);

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
                    pushTicketId: ticketId,
                    pushTicketStatus: 'pending'
                }).select('user pushTicketId');

                if (!notification) {
                    continue;
                }

                if (receipt.status === 'ok') {
                    await Notification.findByIdAndUpdate(notification._id, {
                        pushTicketStatus: 'ok',
                        pushTicketError: null,
                        pushTicketCheckedAt: new Date()
                    });
                    continue;
                }

                const receiptError = receipt.details?.error || receipt.message || 'Unknown receipt error';

                await Notification.findByIdAndUpdate(notification._id, {
                    pushTicketStatus: 'error',
                    pushTicketError: receiptError,
                    pushTicketCheckedAt: new Date()
                });

                if (receipt.details?.error === 'DeviceNotRegistered') {
                    console.error(`   ⚠️ Receipt says device is not registered, clearing token for user ${notification.user}`);
                    await User.findByIdAndUpdate(notification.user, { expoPushToken: null });
                } else {
                    console.error(`   ❌ Push receipt error for ${ticketId}: ${receiptError}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Receipt verification failed:', error.message);
    }
};

/**
 * Start scheduled receipt verification
 */
const startPushReceiptVerificationJob = () => {
    cron.schedule('*/15 * * * *', async () => {
        console.log('🧾 Checking push notification receipts...');

        try {
            const pendingNotifications = await Notification.find({
                pushTicketStatus: 'pending',
                pushTicketId: { $ne: null }
            })
                .select('pushTicketId')
                .limit(300);

            const ticketIds = pendingNotifications
                .map(notification => notification.pushTicketId)
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
    startPushReceiptVerificationJob
};
