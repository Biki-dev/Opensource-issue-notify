import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Use your computer's local IP for Expo Go on physical devices
    // localhost only works on web, use your local IP for mobile devices
    const BASE_URL = 'http://10.119.238.78:5000/api';
    // const BASE_URL = 'http://10.0.2.2:5000/api'; // Android Emulator alternative

    const [unreadCount, setUnreadCount] = useState(0);

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
            setUserToken(res.data.token);
            await AsyncStorage.setItem('userToken', res.data.token);
            updateUnreadCount(res.data.token);
        } catch (e) {
            console.log("Login Error", e);
            throw e;
        }
    };

    const signup = async (name, email, password) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/signup`, { name, email, password });
            setUserToken(res.data.token);
            await AsyncStorage.setItem('userToken', res.data.token);
            updateUnreadCount(res.data.token);
        } catch (e) {
            console.log("Signup Error", e);
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
        <AuthContext.Provider value={{ login, signup, logout, isLoading, userToken, BASE_URL, unreadCount, updateUnreadCount }}>
            {children}
        </AuthContext.Provider>
    );
};
