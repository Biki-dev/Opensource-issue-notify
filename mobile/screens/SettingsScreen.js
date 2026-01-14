import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button } from '../components/UI';
import { Switch } from 'react-native';

const SettingsScreen = () => {
    const { userToken, BASE_URL, logout } = useContext(AuthContext);
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

    const toggleRepoVisibility = async (sub) => {
        try {
            const updated = await axios.patch(
                `${BASE_URL}/repos/${sub._id}`,
                { visible: !sub.visible },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setSubscriptions((prev) => prev.map((s) => (s._id === sub._id ? updated.data : s)));
        } catch (e) {
            console.log(e);
        }
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: logout },
        ]);
    };

    const initials = profile?.name
        ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase()
        : 'JD';

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Card className="flex-row items-center mb-6">
                    <View className="w-16 h-16 rounded-2xl bg-yellow-300 items-center justify-center mr-4">
                        <Text className="text-xl font-extrabold text-gray-900">{initials}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900">{profile?.name || 'John Doe'}</Text>
                        <Text className="text-gray-500 text-sm">{profile?.email || 'john.doe@example.com'}</Text>
                    </View>
                    <Button title="Edit" variant="outline" className="h-10 px-4 rounded-2xl" onPress={() => {}} />
                </Card>

                <Card className="mb-4 flex-row items-center justify-between">
                    <View>
                        <Text className="text-base font-semibold text-gray-900">Notifications</Text>
                        <Text className="text-xs text-gray-500">Manage notification settings</Text>
                    </View>
                    <Switch
                        value={!!profile?.notificationsEnabled}
                        onValueChange={toggleNotifications}
                        thumbColor={profile?.notificationsEnabled ? '#111827' : '#F9FAFB'}
                        trackColor={{ false: '#E5E7EB', true: '#FACC15' }}
                    />
                </Card>

                <Card className="mb-4">
                    <Text className="text-base font-semibold text-gray-900 mb-3">Repository Privacy</Text>
                    {subscriptions.map((s) => (
                        <View key={s._id} className="flex-row items-center justify-between mb-3">
                            <Text className="text-sm text-gray-800">
                                {s.repository?.owner}/{s.repository?.name}
                            </Text>
                            <Switch
                                value={s.visible !== false}
                                onValueChange={() => toggleRepoVisibility(s)}
                                thumbColor={s.visible !== false ? '#111827' : '#F9FAFB'}
                                trackColor={{ false: '#E5E7EB', true: '#FACC15' }}
                            />
                        </View>
                    ))}
                </Card>

                <Card className="mb-4">
                    <TouchableOpacity onPress={() => {}} className="py-1">
                        <Text className="text-base font-semibold text-gray-900 mb-1">Help & Support</Text>
                        <Text className="text-xs text-gray-500">Get help with the app</Text>
                    </TouchableOpacity>
                </Card>

                <Card className="mb-4 bg-red-50 border-red-100">
                    <Button title="Log Out" variant="danger" onPress={handleLogout} />
                </Card>

                <Text className="text-center text-gray-400 text-xs mt-4">Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;
