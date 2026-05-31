const { mergeExpoPushTokens } = require('./expoPushTokens');
const { Expo } = require('expo-server-sdk');

const buildPushStatusForUser = (user) => {
    const tokens = mergeExpoPushTokens(user.expoPushTokens || [], user.expoPushToken || null);
    return {
        email: user.email,
        hasToken: tokens.length > 0,
        tokenCount: tokens.length,
        tokenValid: tokens.some(token => Expo.isExpoPushToken(token)),
        token: tokens[0] ? tokens[0].substring(0, 50) + '...' : 'none',
        notificationsEnabled: user.notificationsEnabled,
        device: user.deviceInfo?.platform || 'unknown'
    };
};

module.exports = { buildPushStatusForUser };
