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
        const user = await User.findById(userId).select('expoPushToken notificationsEnabled');
        
        if (!user || !user.notificationsEnabled || !user.expoPushToken) {
            console.log(`⏭️  Skipping push for user ${userId}: no token or disabled`);
            return { success: false, reason: 'no_token' };
        }

        // Validate token format
        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`❌ Invalid Expo push token for user ${userId}`);
            return { success: false, reason: 'invalid_token' };
        }

        // Create push message
        const message = {
            to: user.expoPushToken,
            sound: 'default',
            title: '🔔 New Issue Matched',
            body: notification.issueTitle,
            data: {
                type: 'new_issue',
                notificationId: notification._id,
                issueUrl: notification.issueUrl,
                repositoryName: `${notification.repository.owner}/${notification.repository.name}`,
                labels: notification.matchedLabels
            },
            badge: 1, // Show badge on app icon
            priority: 'high'
        };

        // Send notification
        const ticket = await expo.sendPushNotificationsAsync([message]);
        
        console.log(`✅ Push notification sent to user ${userId}`);
        console.log(`   Ticket:`, ticket[0]);
        
        return { success: true, ticket: ticket[0] };

    } catch (error) {
        console.error(`❌ Error sending push notification:`, error.message);
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