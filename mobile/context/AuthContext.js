import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { cancelAllRequests } from '../utils/requestManager';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerForPushNotificationsAsync } from '../utils/notifications';

export const AuthContext = createContext();

// Required for GitHub OAuth flow
WebBrowser.maybeCompleteAuthSession();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const BASE_URL = 'https://opensource-issue-notify-production-e468.up.railway.app/api';

    // Register push token with backend
    const registerPushToken = async (token) => {
        try {
            console.log('🔔 [AUTH] Starting push token registration flow...');
            const result = await registerForPushNotificationsAsync();
            const { token: pushToken, error, userMessage } = result;

            console.log('🔔 [AUTH] Push registration result:', result);

            if (pushToken) {
                try {
                    console.log('🔔 [AUTH] Sending token to backend:', pushToken.substring(0, 15) + '...');
                    const response = await axios.post(
                        `${BASE_URL}/auth/register-push-token`,
                        {
                            expoPushToken: pushToken,
                            deviceInfo: {
                                platform: Platform.OS,
                                model: Device.modelName,
                                osVersion: Device.osVersion
                            }
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    console.log('✅ [AUTH] Push token registered with backend successfully');
                } catch (error) {
                    const serverMessage = error.response?.data?.message || error.message;
                    console.error('❌ [AUTH] Backend registration failed:', serverMessage);
                    if (Platform.OS !== 'web') {
                        Alert.alert('Server Error', `Backend rejected token: ${serverMessage}`);
                    }
                }
            } else {
                console.warn('⚠️ [AUTH] No push token obtained:', error);
                const message = userMessage || error || 'Unknown notification error';
                if (Platform.OS !== 'web') {
                    // Show detailed error for debugging
                    Alert.alert('Notification Setup', message);
                }
            }
        } catch (error) {
            console.error('❌ [AUTH] Critical error in registerPushToken:', error.message);
        }
    };

    const updateUnreadCount = async (token) => {
        try {
            const res = await axios.get(`${BASE_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token || userToken}` }
            });
            const unread = (res.data || []).filter(n => !n.isRead).length;
            setUnreadCount(unread);

            try {
                await Notifications.setBadgeCountAsync(unread);
            } catch (badgeError) {
                console.log("Error setting badge count:", badgeError);
            }
        } catch (e) {
            console.log("Error updating unread count", e);
        }
    };

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
            console.log("Login Success", res.data);

            const token = res.data.token;
            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');

            updateUnreadCount(token);
            await registerPushToken(token);

            return res.data;
        } catch (e) {
            console.log("Login Error", e);
            throw e;
        }
    };

    const signup = async (name, email, password) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/signup`, { name, email, password });
            console.log("Signup Success", res.data);

            const token = res.data.token;
            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');

            updateUnreadCount(token);
            await registerPushToken(token);

            return res.data;
        } catch (e) {
            console.log("Signup Error", e);
            throw e;
        }
    };

    const loginWithGitHub = async () => {
        try {
            const redirectUri = Linking.createURL('auth/callback');
            const clientId = 'Ov23liRMnBFgrzjvLxvG';

            const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            if (result.type === 'success' && result.url) {
                const url = new URL(result.url);
                const code = url.searchParams.get('code');

                if (!code) throw new Error('No authorization code received');

                const res = await axios.post(`${BASE_URL}/auth/github`, { code, redirectUri });

                const token = res.data.token;
                setUserToken(token);
                await AsyncStorage.setItem('userToken', token);
                await AsyncStorage.setItem('hasSeenOnboarding', 'true');

                updateUnreadCount(token);
                await registerPushToken(token);

                return res.data;
            } else {
                throw new Error('Authentication cancelled or failed');
            }
        } catch (e) {
            console.log("GitHub Login Error", e);
            throw e;
        }
    };

    const logout = async () => {
        try {
            console.log('🚪 Starting logout process...');
            cancelAllRequests();

            if (userToken) {
                try {
                    await axios.post(
                        `${BASE_URL}/auth/logout`,
                        {},
                        {
                            headers: { Authorization: `Bearer ${userToken}` },
                            timeout: 5000
                        }
                    );
                } catch (err) {
                    console.log('⚠️ Backend logout failed:', err.message);
                }
            }
        } catch (e) {
            console.log('Logout error:', e.message);
        } finally {
            setUserToken(null);
            setUnreadCount(0);
            await AsyncStorage.removeItem('userToken');
            console.log('✅ Logout complete');
        }
    };

    const isLoggedIn = async () => {
        try {
            let token = await AsyncStorage.getItem('userToken');
            setUserToken(token);

            if (token) {
                updateUnreadCount(token);
                registerPushToken(token);
            }
        } catch (e) {
            console.log(`isLoggedIn error ${e}`);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{
            login,
            signup,
            loginWithGitHub,
            logout,
            isLoading,
            userToken,
            BASE_URL,
            unreadCount,
            updateUnreadCount
        }}>
            {children}
        </AuthContext.Provider>
    );
};