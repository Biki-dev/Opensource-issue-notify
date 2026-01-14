import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button } from '../components/UI';
import { Mail, ChevronRight, Bell, Shield, HelpCircle, LogOut } from 'lucide-react-native';
import { MotiView } from 'moti';

const SettingsScreen = ({ navigation }) => {
    const { userToken, BASE_URL, logout, unreadCount, updateUnreadCount } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);

    const fetchData = async () => {
        try {
            const [profileRes, subsRes] = await Promise.all([
                axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${BASE_URL}/repos`, { headers: { Authorization: `Bearer ${userToken}` } }),
            ]);
            setProfile(profileRes.data);
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
                    <Text className="text-3xl font-bold text-white">Settings</Text>
                    <Text className="text-muted text-sm mt-1">Manage your account and preferences</Text>
                </MotiView>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    className="w-12 h-12 rounded-2xl bg-card border border-border items-center justify-center"
                >
                    <Bell size={22} color="#CEFF00" />
                    {unreadCount > 0 && (
                        <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
                {/* User Profile Card */}
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }}>
                    <Card className="flex-row items-center py-5">
                        <View className="w-20 h-20 rounded-2xl bg-brand items-center justify-center mr-4">
                            <Text className="text-3xl font-extrabold text-black">{initials}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-white">{profile?.name || 'Guest User'}</Text>
                            <View className="flex-row items-center mt-1">
                                <Mail size={14} color="#71717A" className="mr-2" />
                                <Text className="text-muted text-sm truncate" numberOfLines={1}>{profile?.email || 'guest@example.com'}</Text>
                            </View>
                        </View>
                        <View className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                            <ChevronRight size={20} color="#71717A" />
                        </View>
                    </Card>
                </MotiView>

                {/* Notifications Card */}
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 200 }}>
                    <Card className="p-0 overflow-hidden">
                        <View className="p-6 flex-row items-center justify-between border-b border-border/50">
                            <View className="flex-row items-center">
                                <View className="w-10 h-10 rounded-full bg-accent/10 items-center justify-center mr-4">
                                    <Bell size={20} color="#FF3B72" />
                                </View>
                                <View>
                                    <Text className="text-base font-bold text-white">Notifications</Text>
                                    <Text className="text-xs text-muted">Manage notification settings</Text>
                                </View>
                            </View>
                        </View>
                        <View className="p-6 pb-2">
                            <View className="flex-row items-center justify-between mb-4">
                                <View>
                                    <Text className="text-sm font-bold text-white">Push Notifications</Text>
                                    <Text className="text-xs text-muted">Get notified about new issues</Text>
                                </View>
                                <Switch
                                    value={!!profile?.notificationsEnabled}
                                    onValueChange={toggleNotifications}
                                    trackColor={{ false: '#27272A', true: '#CEFF00' }}
                                    thumbColor={profile?.notificationsEnabled ? '#fff' : '#A1A1AA'}
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
                                <Shield size={20} color="#CEFF00" />
                            </View>
                            <Text className="text-base font-bold text-white">Repository Privacy & Controls</Text>
                        </View>
                        <View className="p-6">
                            {subscriptions.map((s, index) => (
                                <View key={s._id} className="mb-6 last:mb-0">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-1 mr-4">
                                            <Text className="text-sm font-bold text-brand" numberOfLines={1}>
                                                {s.repository?.owner}/{s.repository?.name}
                                            </Text>
                                            <Text className="text-[10px] text-muted uppercase mt-0.5">
                                                {s.active === false ? 'Turn ON (resume checks)' : 'Turn OFF (pause checks)'}
                                            </Text>
                                        </View>
                                        <Switch
                                            value={s.active !== false}
                                            onValueChange={() => toggleRepoActive(s)}
                                            trackColor={{ false: '#27272A', true: '#CEFF00' }}
                                            thumbColor={s.active !== false ? '#fff' : '#A1A1AA'}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => deleteRepo(s)}
                                        className="bg-accent/5 border border-accent/20 rounded-xl py-3 items-center mt-2"
                                    >
                                        <Text className="text-accent text-xs font-bold">Delete Subscription</Text>
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
                            <View className="w-10 h-10 rounded-full bg-accent/10 items-center justify-center mr-4">
                                <HelpCircle size={20} color="#FF3B72" />
                            </View>
                            <View>
                                <Text className="text-base font-bold text-white">Help & Support</Text>
                                <Text className="text-xs text-muted">Get help with the app</Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color="#71717A" />
                    </Card>
                </MotiView>

                {/* Log Out Button */}
                <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 500 }}>
                    <TouchableOpacity
                        onPress={logout}
                        className="mt-4 mb-8 bg-accent/5 border border-accent/20 rounded-2xl h-16 flex-row items-center justify-center"
                    >
                        <LogOut size={20} color="#FF3B72" className="mr-3" />
                        <Text className="text-accent text-lg font-bold">Log Out</Text>
                    </TouchableOpacity>
                </MotiView>

                <Text className="text-center text-muted text-[10px] uppercase font-bold tracking-widest mt-4">Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;
