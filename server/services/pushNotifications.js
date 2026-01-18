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
        console.log(`\n📤📤📤 ATTEMPTING PUSH NOTIFICATION FOR USER: ${userId}`);
        console.log(`   🔍 User ID type: ${typeof userId}, value: ${userId}`);
        
        // Get user's push token
        const user = await User.findById(userId).select('expoPushToken notificationsEnabled deviceInfo email');
        
        if (!user) {
            console.log(`❌ USER NOT FOUND: ${userId}`);
            console.log(`   🔍 Attempted to find user with ID: ${userId}`);
            return { success: false, reason: 'user_not_found' };
        }

        console.log(`   👤 User Email: ${user.email}`);
        console.log(`   🔔 Notifications Enabled: ${user.notificationsEnabled}`);
        console.log(`   📱 Has Push Token: ${!!user.expoPushToken}`);
        console.log(`   🔍 Push Token Value: ${user.expoPushToken || 'null/undefined'}`);
        
        if (!user.notificationsEnabled) {
            console.log(`⏭️  SKIPPED: User has notifications disabled`);
            return { success: false, reason: 'notifications_disabled' };
        }
        
        if (!user.expoPushToken) {
            console.warn(`⏭️  SKIPPED: NO PUSH TOKEN REGISTERED for user ${userId}`);
            console.log(`   Device info: ${JSON.stringify(user.deviceInfo || {})}`);
            return { success: false, reason: 'no_token' };
        }

        // Validate token format
        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`❌ INVALID TOKEN FORMAT: ${user.expoPushToken}`);
            return { success: false, reason: 'invalid_token' };
        }

        console.log(`✅ TOKEN IS VALID`);
        console.log(`   Token: ${user.expoPushToken}`);
        console.log(`   Issue: ${notification.issueTitle}`);
        console.log(`   Repo: ${notification.repository.owner}/${notification.repository.name}`);

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

        console.log(`📨 SENDING MESSAGE TO EXPO...`);
        console.log(`   To: ${message.to}`);
        console.log(`   Title: ${message.title}`);
        console.log(`   Body: ${message.body}`);

        // Send notification
        const ticket = await expo.sendPushNotificationsAsync([message]);
        
        console.log(`📬 EXPO RESPONSE RECEIVED`);
        console.log(`   Ticket: ${JSON.stringify(ticket[0])}`);

        if (ticket[0].status === 'error') {
            console.error(`❌ EXPO ERROR: ${ticket[0].message}`);
            return { success: false, reason: 'ticket_error', error: ticket[0].message };
        }

        console.log(`✅✅✅ PUSH SENT SUCCESSFULLY!`);
        console.log(`   Device: ${user.deviceInfo?.platform || 'unknown'} (${user.deviceInfo?.model || 'unknown model'})`);
        console.log(`   Ticket ID: ${ticket[0].id}`);
        console.log(`\n`);
        
        return { success: true, ticket: ticket[0] };

    } catch (error) {
        console.error(`❌ ERROR SENDING PUSH:`, error.message);
        console.error(`   Stack: ${error.stack}`);
        console.log(`\n`);
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