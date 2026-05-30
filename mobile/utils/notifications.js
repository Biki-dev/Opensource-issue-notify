import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications are handled when app is in foreground, background, or closed
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Configure notification behavior for background/killed app
Notifications.setNotificationCategoryAsync('new_issue', [
    {
        identifier: 'view',
        buttonTitle: 'View Issue',
        options: { opensAppToForeground: true }
    },
    {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: { opensAppToForeground: false }
    }
]);

if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
        name: 'Issue Notifications',
        importance: Notifications.AndroidImportance.MAX, // ✅ MAX importance
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        enableVibrate: true,    // ✅ Enable vibration
        enableLights: true,     // ✅ Enable LED
        bypassDnd: true,        // ✅ Bypass Do Not Disturb
        showBadge: true,        // ✅ Show badge count
        sound: 'default'        // ✅ Default sound
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
        console.log('📱 Device.isDevice:', Device.isDevice);

        if (!Device.isDevice) {
            console.warn('⚠️ Simulator detected - proceeding anyway for testing');
            // We won't return here so we can try to get a token anyway
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Issue Notifications',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6366F1',
                enableVibrate: true,
                enableLights: true,
                bypassDnd: true,
                showBadge: true,
                sound: 'default'
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return {
                token: null,
                error: 'Permission denied',
                userMessage: 'Notification permission not granted'
            };
        }

        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ||
            Constants.easConfig?.projectId ||
            'd01a75e4-4cba-4431-8de8-e190e6c6fb9c';

        if (!projectId) {
            return {
                token: null,
                error: 'Missing EAS projectId',
                userMessage: 'Push setup is missing project configuration.'
            };
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenResponse.data;

        if (!token) {
            return { token: null, error: 'No token', userMessage: 'Failed to generate push token' };
        }

        console.log('✅ Token generated:', token);
        return { token, error: null };

    } catch (error) {
        console.error('❌ Failed to get push token:', error);
        return { token: null, error: error.message, userMessage: `Error: ${error.message}` };
    }
}

/**
 * Handle notification when tapped and app launch from notification
 */
/**
 * Verify and request permissions (run on every app start)
 */
export async function verifyPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permissions not granted');
        return false;
    }

    return true;
}

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