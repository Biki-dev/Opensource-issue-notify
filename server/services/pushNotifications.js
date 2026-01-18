// server/services/pushNotifications.js

const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

// Create Expo SDK client
const expo = new Expo();

/**
 * Send push notification to user
 * @param {string} userId - MongoDB user ID
 * @param {object} notification - Notification data
 */
const sendPushNotification = async (userId, notification) => {
    try {
        // Get user's push token
        const user = await User.findById(userId).select('expoPushToken notificationsEnabled deviceInfo');
        
        if (!user) {
            console.log(`⏭️  Skipping push for user ${userId}: user not found`);
            return { success: false, reason: 'user_not_found' };
        }

        if (!user.notificationsEnabled) {
            console.log(`⏭️  Skipping push for user ${userId}: notifications disabled`);
            return { success: false, reason: 'notifications_disabled' };
        }
        
        if (!user.expoPushToken) {
            console.warn(`⚠️  No push token registered for user ${userId}`);
            console.log(`   Device info: ${JSON.stringify(user.deviceInfo || 'not set')}`);
            return { success: false, reason: 'no_token' };
        }

        // Validate token format
        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`❌ Invalid Expo push token format for user ${userId}: ${user.expoPushToken}`);
            return { success: false, reason: 'invalid_token' };
        }

        // Create push message
        const message = {
            to: user.expoPushToken,
            sound: 'default',
            title: '🔔 New Issue Matched!',
            body: notification.issueTitle,
            data: {
                type: 'new_issue',
                notificationId: notification._id?.toString(),
                issueUrl: notification.issueUrl,
                repositoryName: `${notification.repository.owner}/${notification.repository.name}`,
                labels: notification.matchedLabels
            },
            badge: 1,
            priority: 'high'
        };

        console.log(`📤 Sending push notification to user ${userId}...`);
        console.log(`   Token: ${user.expoPushToken.substring(0, 30)}...`);
        console.log(`   Title: ${message.title}`);
        console.log(`   Body: ${message.body}`);

        // Send notification
        const ticket = await expo.sendPushNotificationsAsync([message]);
        
        if (ticket[0].status === 'error') {
            console.error(`❌ Push ticket error for user ${userId}:`, ticket[0].message);
            return { success: false, reason: 'ticket_error', error: ticket[0].message };
        }

        console.log(`✅ Push notification sent successfully!`);
        console.log(`   Device: ${user.deviceInfo?.platform || 'unknown'} (${user.deviceInfo?.model || 'unknown model'})`);
        console.log(`   Ticket ID: ${ticket[0].id}`);
        
        return { success: true, ticket: ticket[0] };

    } catch (error) {
        console.error(`❌ Error sending push notification:`, error.message);
        console.error(`   Stack: ${error.stack}`);
        return { success: false, error: error.message };
    }
};

/**
 * Send push notifications in batch
 * @param {Array} notifications - Array of {userId, notification} objects
 */
const sendBatchPushNotifications = async (notifications) => {
    const chunks = expo.chunkPushNotifications(
        notifications.map(n => ({
            to: n.expoPushToken,
            title: '🔔 New Issue Matched',
            body: n.notification.issueTitle,
            data: n.notification
        }))
    );

    const tickets = [];
    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('Error sending push notification chunk:', error);
        }
    }

    return tickets;
};

module.exports = {
    sendPushNotification,
    sendBatchPushNotifications
};