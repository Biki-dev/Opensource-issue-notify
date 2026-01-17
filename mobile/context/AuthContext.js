import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export const AuthContext = createContext();

// Required for GitHub OAuth flow
WebBrowser.maybeCompleteAuthSession();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const BASE_URL ='https://opensource-issue-notify-production-e468.up.railway.app/api';
    const updateUnreadCount = async (token) => {
        try {
            const res = await axios.get(`${BASE_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token || userToken}` }
            });
            const unread = (res.data || []).filter(n => !n.isRead).length;
            setUnreadCount(unread);
        } catch (e) {
            console.log("Error updating unread count", e);
        }
    };

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
            console.log("Login Success", res.data);

            // Set token first
            const token = res.data.token;
            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);

            // Mark onboarding as seen
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');

            // Update unread count
            updateUnreadCount(token);

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

            // Set token first
            const token = res.data.token;
            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);

            // Mark onboarding as seen
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');

            // Update unread count
            updateUnreadCount(token);

            return res.data;
        } catch (e) {
            console.log("Signup Error", e);
            throw e;
        }
    };

    const loginWithGitHub = async () => {
        try {
            // Step 1: Open GitHub OAuth page
            const redirectUri = Linking.createURL('auth/callback');
            const clientId = 'Ov23liRMnBFgrzjvLxvG'; // Replace with actual client ID

            const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            if (result.type === 'success' && result.url) {
                // Extract the code from the callback URL
                const url = new URL(result.url);
                const code = url.searchParams.get('code');

                if (!code) {
                    throw new Error('No authorization code received');
                }

                // Step 2: Exchange code for token via backend
                const res = await axios.post(`${BASE_URL}/auth/github`, { code, redirectUri });

                // Set token first
                const token = res.data.token;
                setUserToken(token);
                await AsyncStorage.setItem('userToken', token);

                // Mark onboarding as seen
                await AsyncStorage.setItem('hasSeenOnboarding', 'true');

                // Update unread count
                updateUnreadCount(token);

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
        setUserToken(null);
        setUnreadCount(0);
        await AsyncStorage.removeItem('userToken');
    };

    const isLoggedIn = async () => {
        try {
            let token = await AsyncStorage.getItem('userToken');
            setUserToken(token);
            if (token) updateUnreadCount(token);
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