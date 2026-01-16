import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button, SwitchRow, SectionHeader, shadowStyles } from '../components/UI';
import { Mail, ChevronRight, Bell, Shield, HelpCircle, LogOut, Edit3, Check, X, User, Lock, Globe, Smartphone, Clock, Github } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

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

    const handleUpdateName = async () => {
        const trimmed = editName.trim();
        if (!trimmed || trimmed.length > 20) {
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
        : 'U';

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 pt-4 pb-4">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                >
                    <Text className="text-4xl font-poppins-bold text-primary">Settings</Text>
                </MotiView>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
                {/* Profile Section */}
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 400 }}
                >
                    <Card className="p-0 overflow-hidden mb-8 shadow-sm">
                        <View className="p-8 items-center">
                            <View className="relative">
                                {profile?.profilePicture ? (
                                    // Show GitHub/uploaded profile picture
                                    <MotiView
                                        from={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="relative"
                                    >
                                        <Image
                                            source={{ uri: profile.profilePicture }}
                                            className="w-24 h-24 rounded-[32px]"
                                            style={shadowStyles.medium}
                                        />
                                    </MotiView>
                                ) : (
                                    // Show initials gradient as fallback
                                    <LinearGradient
                                        colors={['#6366F1', '#8B5CF6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        className="w-24 h-24 rounded-[32px] items-center justify-center shadow-xl"
                                        style={shadowStyles.medium}
                                    >
                                        <Text className="text-4xl font-poppins-bold text-white">{initials}</Text>
                                    </LinearGradient>
                                )}

                                <TouchableOpacity
                                    onPress={() => setIsEditing(true)}
                                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-border rounded-xl items-center justify-center shadow-sm"
                                >
                                    <Edit3 size={18} color="#6366F1" />
                                </TouchableOpacity>
                            </View>

                            <View className="mt-6 items-center w-full">
                                {isEditing ? (
                                    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} className="w-full flex-row items-center">
                                        <TextInput
                                            className="flex-1 bg-slate-50 border border-brand h-14 rounded-xl px-4 text-primary font-poppins-semibold text-lg"
                                            value={editName}
                                            onChangeText={setEditName}
                                            autoFocus
                                            placeholder="Your Name"
                                            placeholderTextColor="#94A3B8"
                                        />
                                        <TouchableOpacity
                                            onPress={handleUpdateName}
                                            className="ml-2 w-14 h-14 bg-brand rounded-xl items-center justify-center shadow-sm"
                                        >
                                            {saveLoading ? <ActivityIndicator color="white" /> : <Check size={24} color="white" />}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setIsEditing(false);
                                                setEditName(profile?.name || '');
                                            }}
                                            className="ml-2 w-14 h-14 bg-slate-200 rounded-xl items-center justify-center"
                                        >
                                            <X size={24} color="#64748B" />
                                        </TouchableOpacity>
                                    </MotiView>
                                ) : (
                                    <>
                                        <Text className="text-2xl font-poppins-bold text-primary">{profile?.name || 'Maintainer'}</Text>
                                        <Text className="text-muted font-inter-medium text-base mt-1">{profile?.email}</Text>

                                        {/* Auth Method Badge */}
                                        <View className="flex-row items-center mt-3">
                                            {profile?.authMethod === 'github' ? (
                                                <View className="bg-[#0F172A] px-4 py-1.5 rounded-full flex-row items-center border border-slate-700">
                                                    <Github size={12} color="white" className="mr-2" />
                                                    <Text className="text-white text-[10px] font-poppins-bold uppercase tracking-wider">
                                                        GitHub Account
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View className="bg-brand/10 px-4 py-1.5 rounded-full border border-brand/20">
                                                    <Text className="text-brand text-[10px] font-poppins-bold uppercase tracking-wider">
                                                        Email Account
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View className="bg-success/10 px-4 py-1.5 rounded-full mt-3 border border-success/20">
                                            <Text className="text-success text-[10px] font-poppins-bold uppercase tracking-wider">
                                                {profile?.plan === 'pro' ? 'Professional' : 'Free'} Plan
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>

                        <View className="flex-row border-t border-border/50 bg-slate-50 py-6">
                            <View className="flex-1 items-center border-r border-border/50">
                                <Text className="text-xl font-poppins-bold text-primary">{subscriptions.length}</Text>
                                <Text className="text-[10px] text-muted font-inter-bold uppercase">Repos</Text>
                            </View>
                            <View className="flex-1 items-center">
                                <Text className="text-xl font-poppins-bold text-primary">{unreadCount}</Text>
                                <Text className="text-[10px] text-muted font-inter-bold uppercase">Unread</Text>
                            </View>
                        </View>
                    </Card>
                </MotiView>

                {/* Application Settings */}
                <SectionHeader title="Application" icon={Smartphone} />
                <Card className="px-6 py-2 mb-8">
                    <SwitchRow
                        label="Push Notifications"
                        value={!!profile?.notificationsEnabled}
                        onValueChange={toggleNotifications}
                        icon={Bell}
                    />
                </Card>

                {/* Privacy Section */}
                <SectionHeader title="Privacy" icon={Shield} />
                <Card className="px-6 py-2 mb-8">
                    <TouchableOpacity className="flex-row items-center justify-between py-4">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-4">
                                <HelpCircle size={20} color="#6366F1" />
                            </View>
                            <Text className="text-base font-inter-medium text-primary">Privacy Policy</Text>
                        </View>
                        <ChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </Card>

                {/* Logout Button */}
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 400 }}
                >
                    <Button
                        title="Sign Out"
                        variant="danger"
                        icon={LogOut}
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                if (window.confirm('Are you sure you want to sign out?')) {
                                    logout();
                                }
                            } else {
                                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Sign Out', style: 'destructive', onPress: logout }
                                ]);
                            }
                        }}
                        className="mb-8"
                    />

                    <View className="items-center pb-8 pt-8">
                        <Text className="text-muted font-inter-bold text-[10px] uppercase tracking-[4px]">Issue Notify v1.2.0</Text>
                        <Text className="text-muted/40 font-inter-medium text-[10px] mt-2 italic">Crafted for maintainers</Text>
                    </View>
                </MotiView>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;