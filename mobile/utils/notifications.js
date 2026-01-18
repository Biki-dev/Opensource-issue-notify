import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground, background, or closed
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Configure notification behavior for background/killed app
if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
        name: 'Issue Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        enableVibrate: true,
        enableLights: true,
        bypassDnd: true, // Bypass Do Not Disturb
    }).catch(() => {
        // Channel may already exist, ignore error
    });
}

/**
 * Register for push notifications
 * @returns {Promise<string|null>} Expo push token or null
 */
export async function registerForPushNotificationsAsync() {
    try {
        console.log('🔔 Starting push notification registration...');

        // Check if device
        if (!Device.isDevice) {
            console.warn('⚠️  Simulator detected - push notifications not available on simulator');
            return null;
        }

        // Configure Android channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6366F1',
            });
            console.log('✅ Android notification channel configured');
        }

        // Get existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        console.log('📋 Current permission status:', existingStatus);
        
        let finalStatus = existingStatus;
        
        // Request permissions if not granted
        if (existingStatus !== 'granted') {
            console.log('🔔 Requesting notification permissions...');
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
            console.log('📋 Permission request result:', status);
        }
        
        // Check final status
        if (finalStatus !== 'granted') {
            console.warn('❌ Push notification permission not granted. Status:', finalStatus);
            return null;
        }

        // Get the push token
        console.log('🔔 Getting push token...');
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        const token = tokenResponse.data;
        
        if (!token) {
            console.error('❌ No token returned from getExpoPushTokenAsync');
            return null;
        }
        
        console.log('✅ Got Expo Push Token:', token);
        return token;
        
    } catch (error) {
        console.error('❌ Failed to get push token:', error);
        console.error('   Error details:', error.message);
        return null;
    }
}

/**
 * Handle notification when tapped and app launch from notification
 */
export function setupNotificationListeners(navigation) {
    // Handle notification tapped when app is running
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification tapped:', response);
        
        const data = response.notification.request.content.data;
        
        if (data?.type === 'new_issue' && data?.issueUrl) {
            // Navigate to notifications screen
            navigation.navigate('Notifications', { issueUrl: data.issueUrl });
        }
    });

    // Handle app launch from notification tap
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notification received (app in foreground):', notification);
    });

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then(response => {
        if (!response) {
            console.log('ℹ️  App opened normally (not from notification)');
            return;
        }

        console.log('🚀 App launched from notification:', response);
        const data = response.notification.request.content.data;
        
        if (data?.type === 'new_issue' && data?.issueUrl) {
            navigation.navigate('Notifications', { issueUrl: data.issueUrl });
        }
    }).catch(err => {
        console.log('Error checking notification response:', err);
    });

    return () => {
        Notifications.removeNotificationSubscription(responseListener);
        Notifications.removeNotificationSubscription(notificationListener);
    };
}