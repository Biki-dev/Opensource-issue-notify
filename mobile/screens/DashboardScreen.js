import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button, LabelChip, AnimatedMascot } from '../components/UI';
import { GitBranch, ExternalLink, Bell, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';

const DashboardScreen = ({ navigation }) => {
    const { userToken, BASE_URL, unreadCount, updateUnreadCount } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [subsRes, notifRes] = await Promise.all([
                axios.get(`${BASE_URL}/repos`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${userToken}` } }),
            ]);
            setSubs(subsRes.data || []);
            setNotifications(notifRes.data || []);
            updateUnreadCount();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchData);
        return unsubscribe;
    }, [navigation]);

    const handleDeleteNotification = async (id) => {
        try {
            await axios.delete(`${BASE_URL}/notifications/${id}`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setNotifications(prev => prev.filter(n => n._id !== id));
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        }
    };

    const totalLabels = subs.reduce((sum, s) => sum + (s.labels?.length || 0), 0);

    const renderIssue = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100 * (index % 10), type: 'timing' }}
        >
            <Card className="mb-4">
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center flex-1">
                        <GitBranch size={16} color="#8A93A5" className="mr-2" />
                        <Text className="text-sm text-muted font-inter" numberOfLines={1}>
                            {item.repository?.owner}/{item.repository?.name}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteNotification(item._id)}>
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                <Text className="text-base font-inter-semibold text-primary mb-3" numberOfLines={2}>
                    {item.issueTitle}
                </Text>

                <View className="flex-row flex-wrap mb-4">
                    {item.matchedLabels.map((l, i) => (
                        <LabelChip key={i} label={l} />
                    ))}
                </View>

                <Button
                    title="Open Issue"
                    variant={index % 2 === 0 ? 'accent' : 'primary'}
                    onPress={() => { }} // Handle link
                    className="h-12 rounded-xl"
                />
            </Card>
        </MotiView>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 pt-6 pb-4 flex-row justify-between items-center">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 500 }}
                >
                    <Text className="text-3xl font-poppins-bold text-primary">Issue Notifier</Text>
                    <Text className="text-muted text-sm mt-1 font-inter-medium">Stay updated with your repositories</Text>
                </MotiView>
                <MotiView
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                        className="w-12 h-12 rounded-2xl bg-card border border-border items-center justify-center"
                    >
                        <Bell size={22} color="#D97706" />
                        {unreadCount > 0 && (
                            <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />
                        )}
                    </TouchableOpacity>
                </MotiView>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item._id}
                renderItem={renderIssue}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                ListHeaderComponent={
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 200, type: 'timing' }}
                        className="mt-2"
                    >


                        <Card className="py-5">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-12 h-12 rounded-2xl bg-brand/10 items-center justify-center mr-4">
                                        <GitBranch size={24} color="#D97706" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-lg font-poppins-bold text-primary">Active Subscriptions</Text>
                                        <Text className="text-xs text-muted font-inter">Monitoring repositories</Text>
                                    </View>
                                </View>
                                <Text className="text-4xl font-montserrat text-primary ml-4">{subs.length}</Text>
                            </View>
                        </Card>

                        <Button
                            variant="secondary"
                            title={
                                <View className="flex-row items-center">
                                    <Text className="text-primary font-inter-semibold mr-2">View All</Text>
                                    <ExternalLink size={14} color="#0F172A" />
                                </View>
                            }
                            className="bg-card border-border mb-6 h-12"
                            onPress={() => navigation.navigate('SubscriptionsTab')}
                        />

                        <View className="flex-row justify-between items-center mt-4 mb-2">
                            <Text className="text-xl font-poppins-bold text-primary">Recent Issues</Text>
                            <Text className="text-xs text-muted font-inter-medium">{notifications.length} total</Text>
                        </View>
                    </MotiView>
                }
                ListEmptyComponent={!loading && (
                    <View className="items-center">
                        <AnimatedMascot
                            source={require('../maskot/add.png')}
                            style={{ width: 320, height: 320, resizeMode: 'contain', marginTop: -20 }}
                        />
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 300 }}
                        >
                            <Text className="text-primary text-2xl font-poppins-bold text-center mb-1">Stay updated!</Text>
                            <Text className="text-muted text-sm font-inter-medium text-center px-10 leading-5">
                                New matching issues will appear here. Tap View All to manage your tracking.
                            </Text>
                        </MotiView>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

export default DashboardScreen;
