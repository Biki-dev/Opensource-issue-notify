import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button } from '../components/UI';
import { Mail, ChevronRight, Bell, Shield, HelpCircle, LogOut, Edit3, Check, X } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';

const SettingsScreen = ({ navigation }) => {
    const { userToken, BASE_URL, logout, unreadCount, updateUnreadCount } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);

    const fetchData = async () => {
        try {
            const [profileRes, subsRes] = await Promise.all([
                axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${BASE_URL}/repos`, { headers: { Authorization: `Bearer ${userToken}` } }),
            ]);
            setProfile(profileRes.data);
            setEditName(profileRes.data.name);
            setSubscriptions(subsRes.data || []);
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleNotifications = async () => {
        try {
            const updated = await axios.patch(
                `${BASE_URL}/auth/me`,
                { notificationsEnabled: !profile.notificationsEnabled },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setProfile(updated.data);
        } catch (e) {
            console.log(e);
        }
    };

    const toggleRepoActive = async (sub) => {
        try {
            const updated = await axios.patch(
                `${BASE_URL}/repos/${sub._id}`,
                { active: sub.active === false },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setSubscriptions((prev) => prev.map((s) => (s._id === sub._id ? updated.data : s)));
        } catch (e) {
            console.log(e);
        }
    };

    const deleteRepo = async (sub) => {
        try {
            await axios.delete(`${BASE_URL}/repos/${sub._id}`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setSubscriptions((prev) => prev.filter((s) => s._id !== sub._id));
        } catch (e) {
            console.log(e);
        }
    };

    const handleUpdateName = async () => {
        const trimmed = editName.trim();
        if (!trimmed || trimmed.length > 12) {
            setIsEditing(false);
            setEditName(profile?.name || '');
            return;
        }
        setSaveLoading(true);
        try {
            const updated = await axios.patch(
                `${BASE_URL}/auth/me`,
                { name: trimmed },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setProfile(updated.data);
            setIsEditing(false);
        } catch (e) {
            console.log(e);
        } finally {
            setSaveLoading(false);
        }
    };

    const initials = profile?.name
        ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase()
        : 'G';

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 pt-6 pb-4 flex-row justify-between items-center">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                >
                    <Text className="text-3xl font-poppins-bold text-primary">Settings</Text>
                    <Text className="text-muted text-sm mt-1 font-inter-medium">Manage your account and preferences</Text>
                </MotiView>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    className="w-12 h-12 rounded-2xl bg-card border border-border items-center justify-center"
                >
                    <Bell size={22} color="#D97706" />
                    {unreadCount > 0 && (
                        <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-danger rounded-full border-2 border-card" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
                {/* User Profile Card */}
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }}>
                    <Card className="p-0 overflow-hidden">
                        <View className="flex-row items-start p-6">
                            <View className="w-20 h-20 rounded-[28px] bg-brand items-center justify-center shadow-2xl shadow-brand/20">
                                <Text className="text-3xl font-montserrat text-black">{initials}</Text>
                            </View>
                            <View className="flex-1 ml-6">
                                <View className="flex-row items-center mb-2 h-10">
                                    <AnimatePresence exitBeforeEnter>
                                        {isEditing ? (
                                            <MotiView
                                                key="editing"
                                                from={{ opacity: 0, scale: 0.9, translateX: -10 }}
                                                animate={{ opacity: 1, scale: 1, translateX: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, translateX: -10 }}
                                                transition={{ type: 'timing', duration: 250 }}
                                                className="flex-1 flex-row items-center"
                                            >
                                                <View className="flex-1 bg-muted/5 rounded-xl px-3 py-2 border border-border/50 flex-row items-center mr-2">
                                                    <TextInput
                                                        className="text-lg font-poppins-bold text-primary flex-1 p-0"
                                                        value={editName}
                                                        onChangeText={setEditName}
                                                        autoFocus
                                                        maxLength={12}
                                                        placeholder="Your Name"
                                                        placeholderTextColor="#55607780"
                                                    />
                                                    <Text className="text-[8px] font-inter-semibold text-muted/40 ml-1">
                                                        {editName.length}/12
                                                    </Text>
                                                </View>
                                                <View className="flex-row gap-2">
                                                    <TouchableOpacity
                                                        onPress={handleUpdateName}
                                                        disabled={saveLoading}
                                                        className="w-10 h-10 rounded-xl bg-brand items-center justify-center shadow-lg shadow-brand/20"
                                                    >
                                                        {saveLoading ? <ActivityIndicator size="small" color="#fff" /> : <Check size={20} color="#fff" />}
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setIsEditing(false);
                                                            setEditName(profile?.name || '');
                                                        }}
                                                        className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-border shadow-sm shadow-black/5"
                                                    >
                                                        <X size={20} color="#556077" />
                                                    </TouchableOpacity>
                                                </View>
                                            </MotiView>
                                        ) : (
                                            <MotiView
                                                key="viewing"
                                                from={{ opacity: 0, scale: 0.9, translateX: 10 }}
                                                animate={{ opacity: 1, scale: 1, translateX: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, translateX: 10 }}
                                                transition={{ type: 'timing', duration: 250 }}
                                                className="flex-row items-center"
                                            >
                                                <Text className="text-2xl font-poppins-bold text-primary mr-2" numberOfLines={1}>
                                                    {profile?.name || 'User'}
                                                </Text>
                                                <View className="bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                                                    <Text className="text-brand text-[8px] font-poppins-bold uppercase">Pro Member</Text>
                                                </View>
                                            </MotiView>
                                        )}
                                    </AnimatePresence>
                                </View>
                                <View className="flex-row items-center">
                                    <Mail size={14} color="#55607780" className="mr-2" />
                                    <Text className="text-muted text-sm font-inter-semibold" numberOfLines={1}>
                                        {profile?.email || 'user@example.com'}
                                    </Text>
                                </View>
                            </View>

                            {!isEditing && (
                                <TouchableOpacity
                                    onPress={() => setIsEditing(true)}
                                    className="w-12 h-12 rounded-2xl bg-white items-center justify-center border border-border shadow-sm shadow-black/5"
                                >
                                    <Edit3 size={20} color="#556077" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View className="flex-row py-4 px-6 bg-brand/5 rounded-b-[32px]">
                            <View className="flex-1 items-center border-r border-border">
                                <Text className="text-primary font-montserrat text-lg">{subscriptions.length}</Text>
                                <Text className="text-muted text-[10px] font-inter-bold uppercase tracking-widest">Repos</Text>
                            </View>
                            <View className="flex-1 items-center">
                                <Text className="text-primary font-montserrat text-lg">{unreadCount}</Text>
                                <Text className="text-muted text-[10px] font-inter-bold uppercase tracking-widest">Unread</Text>
                            </View>
                            <View className="flex-1 items-center border-l border-border">
                                <Text className="text-primary font-montserrat text-lg">6</Text>
                                <Text className="text-muted text-[10px] font-inter-bold uppercase tracking-widest">Impact</Text>
                            </View>
                        </View>
                    </Card>
                </MotiView>

                {/* Notifications Card */}
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 200 }}>
                    <Card className="p-0 overflow-hidden">
                        <View className="p-6 flex-row items-center justify-between border-b border-border/50">
                            <View className="flex-row items-center">
                                <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-4">
                                    <Bell size={20} color="#D97706" />
                                </View>
                                <View>
                                    <Text className="text-base font-poppins-bold text-primary">Notifications</Text>
                                    <Text className="text-xs text-muted font-inter-medium">Manage notification settings</Text>
                                </View>
                            </View>
                        </View>
                        <View className="p-6 pb-2">
                            <View className="flex-row items-center justify-between mb-4">
                                <View>
                                    <Text className="text-sm font-inter-bold text-primary">Push Notifications</Text>
                                    <Text className="text-xs text-muted font-inter-medium">Get notified about new issues</Text>
                                </View>
                                <Switch
                                    value={!!profile?.notificationsEnabled}
                                    onValueChange={toggleNotifications}
                                    trackColor={{ false: '#E9E3DD', true: '#D97706' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#E9E3DD"
                                />
                            </View>
                        </View>
                    </Card>
                </MotiView>

                {/* Repository Privacy & Controls Card */}
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 300 }}>
                    <Card className="p-0 overflow-hidden">
                        <View className="p-6 flex-row items-center border-b border-border/50">
                            <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-4">
                                <Shield size={20} color="#D97706" />
                            </View>
                            <Text className="text-base font-poppins-bold text-primary">Repository Privacy & Controls</Text>
                        </View>
                        <View className="p-6">
                            {subscriptions.map((s, index) => (
                                <View key={s._id} className="mb-6 last:mb-0">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-1 mr-4">
                                            <Text className="text-sm font-inter-bold text-brand" numberOfLines={1}>
                                                {s.repository?.owner}/{s.repository?.name}
                                            </Text>
                                            <Text className="text-[10px] text-muted uppercase mt-0.5">
                                                {s.active === false ? 'Turn ON (resume checks)' : 'Turn OFF (pause checks)'}
                                            </Text>
                                        </View>
                                        <Switch
                                            value={s.active !== false}
                                            onValueChange={() => toggleRepoActive(s)}
                                            trackColor={{ false: '#E9E3DD', true: '#D97706' }}
                                            thumbColor="#FFFFFF"
                                            ios_backgroundColor="#E9E3DD"
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => deleteRepo(s)}
                                        className="bg-danger/5 border border-danger/20 rounded-xl py-3 items-center mt-2"
                                    >
                                        <Text className="text-danger text-xs font-inter-bold">Delete Subscription</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </Card>
                </MotiView>

                {/* Help & Support Card */}
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 400 }}>
                    <Card className="flex-row items-center justify-between py-5">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-4">
                                <HelpCircle size={20} color="#D97706" />
                            </View>
                            <View>
                                <Text className="text-base font-poppins-bold text-primary">Help & Support</Text>
                                <Text className="text-xs text-muted font-inter-medium">Get help with the app</Text>
                            </View>
                        </View>

                    </Card>
                </MotiView>

                {/* Log Out Button */}
                <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 500 }}>
                    <TouchableOpacity
                        onPress={logout}
                        className="mt-4 mb-8 bg-danger/5 border border-danger/20 rounded-2xl h-16 flex-row items-center justify-center"
                    >
                        <LogOut size={20} color="#EF4444" className="mr-3" />
                        <Text className="text-danger text-lg font-inter-bold">Log Out</Text>
                    </TouchableOpacity>
                </MotiView>

                <Text className="text-center text-muted text-[10px] uppercase font-inter-bold tracking-widest mt-4">Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;
