const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

// Create Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a user when a new issue matches their subscription
 * @param {string} userId - MongoDB user ID
 * @param {object} notification - Notification data with issueTitle, issueUrl, repository, matchedLabels
 * @returns {Promise<{success: boolean, reason?: string, ticket?: object}>}
 */
const sendPushNotification = async (userId, notification) => {
    try {
        // Get user with push token
        const user = await User.findById(userId).select('expoPushToken notificationsEnabled deviceInfo');
        
        // Check if user exists
        if (!user) {
            return { success: false, reason: 'user_not_found' };
        }

        // Check if notifications are enabled
        if (!user.notificationsEnabled) {
            return { success: false, reason: 'notifications_disabled' };
        }

        // Check if user has a push token
        if (!user.expoPushToken) {
            return { success: false, reason: 'no_token' };
        }

        // Validate token format
        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`Invalid Expo push token format for user ${userId}`);
            return { success: false, reason: 'invalid_token' };
        }

        // Create push notification message
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
            priority: 'high'
        };

        // Send notification via Expo
        const tickets = await expo.sendPushNotificationsAsync([message]);
        const ticket = tickets[0];

        // Check for errors in response
        if (ticket.status === 'error') {
            console.error(`Expo push error for user ${userId}:`, ticket.message);
            return { success: false, reason: 'expo_error', error: ticket.message };
        }

        // Success
        console.log(`✅ Push notification sent to user ${userId} (${user.deviceInfo?.platform || 'unknown'})`);
        return { success: true, ticket };

    } catch (error) {
        console.error(`Error sending push notification to user ${userId}:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPushNotification
};
