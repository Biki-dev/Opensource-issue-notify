const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

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
                channelId: 'default' // ✅ Specify Android channel
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
    // Placeholder for receipt verification logic
    // In a real app, you would store ticketIDs and check them later using expo.getPushNotificationReceiptsAsync
    console.log('ℹ️ verifyPushReceipts called with:', ticketIds);
};

module.exports = {
    sendPushNotification,
    verifyPushReceipts
};
