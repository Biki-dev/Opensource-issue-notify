import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register for push notifications
 * @returns {Promise<string|null>} Expo push token or null
 */
export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366F1',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }
        
        token = (await Notifications.getExpoPushTokenAsync()).data;
        if (__DEV__) {
            console.log('📱 Expo Push Token:', token);
        }    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

/**
 * Handle notification when tapped
 */
export function setupNotificationListeners(navigation) {
    // Handle notification received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notification received:', notification);
    });

    // Handle notification tapped
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification tapped:', response);
        
        const data = response.notification.request.content.data;
        
        if (data?.type === 'new_issue' && data?.issueUrl) {
            // Navigate to notifications screen or open URL
            navigation.navigate('Notifications', { issueUrl: data.issueUrl });
        }
    });

    return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
    };
}