import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, Linking, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, AnimatedMascot, LabelChip, Button, shadowStyles } from '../components/UI';
import { ArrowLeft, ExternalLink, GitBranch, Bell, CheckCheck, Trash2, Calendar, Circle } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { StatusBar } from 'expo-status-bar';

const NotificationsScreen = ({ navigation }) => {
    const { userToken, BASE_URL, updateUnreadCount } = useContext(AuthContext);
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifs = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/notifications`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const unread = (res.data || []).filter(n => !n.isRead);
            setNotifs(unread);
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchNotifs);
        return unsubscribe;
    }, [navigation, userToken]);

    const handleOpenNotification = async (item) => {
        try {
            Linking.openURL(item.issueUrl);
            await axios.patch(`${BASE_URL}/notifications/${item._id}`, {
                isRead: true,
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setNotifs((prev) => prev.filter((n) => n._id !== item._id));
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        }
    };

    const handleMarkAllRead = async () => {
        if (notifs.length === 0) return;
        try {
            await axios.post(`${BASE_URL}/notifications/mark-all-read`, {}, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setNotifs([]);
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        }
    };

    const handleDelete = async (id) => {
        try {
            // Logic Change: Mark as read to remove from Inbox while keeping on Dashboard
            await axios.patch(`${BASE_URL}/notifications/${id}`, { isRead: true }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setNotifs(prev => prev.filter(n => n._id !== id));
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifs();
    };

    const renderItem = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20, scale: 0.95 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20, delay: index * 50 }}
        >
            <View style={shadowStyles.light} className="mb-6">
                <Card className="p-0 overflow-hidden mb-0">
                    <TouchableOpacity
                        onPress={() => handleOpenNotification(item)}
                        activeOpacity={0.7}
                        className="p-6"
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center flex-1">
                                <View className="bg-brand/10 p-2 rounded-lg mr-3">
                                    <GitBranch size={16} color="#6366F1" />
                                </View>
                                <Text className="text-xs text-muted font-mono" numberOfLines={1}>
                                    {item.repository?.owner}/{item.repository?.name}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <MotiView
                                    from={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="bg-brand p-1.5 rounded-full mr-12"
                                />
                            </View>
                        </View>

                        <Text className="text-xl font-poppins-bold text-primary mb-4 leading-7 pr-10">
                            {item.issueTitle}
                        </Text>

                        <View className="flex-row flex-wrap mb-4">
                            {item.matchedLabels.map((l, i) => (
                                <LabelChip key={i} label={l} selected />
                            ))}
                        </View>

                        <View className="flex-row items-center pt-4 border-t border-border/50 justify-between">
                            <View className="flex-row items-center">
                                <Calendar size={14} color="#94A3B8" className="mr-2" />
                                <Text className="text-muted text-xs font-inter-medium">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <Text className="text-brand font-inter-bold text-sm mr-2">Open Issue</Text>
                                <ExternalLink size={14} color="#6366F1" />
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Separate Delete Button (Not Nested) */}
                    <TouchableOpacity
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                if (window.confirm('Remove this from your Inbox? It will still be visible on your Dashboard.')) {
                                    handleDelete(item._id);
                                }
                            } else {
                                Alert.alert(
                                    'Dismiss Notification',
                                    'Remove this from your Inbox? It will still be visible on your Dashboard.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Dismiss', style: 'default', onPress: () => handleDelete(item._id) }
                                    ]
                                );
                            }
                        }}
                        className="absolute top-6 right-6 w-10 h-10 items-center justify-center rounded-xl bg-slate-100"
                    >
                        <Trash2 size={18} color="#64748B" />
                    </TouchableOpacity>
                </Card>
            </View>
        </MotiView>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border shadow-sm"
                        style={shadowStyles.light}
                    >
                        <ArrowLeft size={22} color="#0F172A" />
                    </TouchableOpacity>
                    <View className="ml-4">
                        <Text className="text-2xl font-poppins-bold text-primary">Inbox</Text>
                        <Text className="text-muted text-xs font-inter-semibold uppercase tracking-wider">
                            {notifs.length} New Updates
                        </Text>
                    </View>
                </View>

                {notifs.length > 0 && (
                    <TouchableOpacity
                        onPress={handleMarkAllRead}
                        className="w-12 h-12 bg-success/10 items-center justify-center rounded-2xl border border-success/20"
                    >
                        <CheckCheck size={22} color="#10B981" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifs}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                }
                ListEmptyComponent={
                    !loading && (
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="items-center py-20"
                        >
                            <AnimatedMascot
                                source={require('../maskot/confused.png')}
                                style={{ width: 300, height: 300 }}
                            />
                            <Text className="text-primary text-3xl font-poppins-bold text-center mt-6">All clear!</Text>
                            <Text className="text-muted text-base font-inter-medium text-center px-10 mt-2 leading-6">
                                You're completely caught up. We'll notify you as soon as new issues match your filters.
                            </Text>
                            <Button
                                title="Back to Dashboard"
                                onPress={() => navigation.goBack()}
                                className="mt-10 px-8"
                                variant="outline"
                            />
                        </MotiView>
                    )
                }
            />
        </SafeAreaView>
    );
};

export default NotificationsScreen;
