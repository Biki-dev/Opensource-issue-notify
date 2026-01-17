import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, Linking, TouchableOpacity, RefreshControl, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, AnimatedMascot, LabelChip, Button, shadowStyles, ListSkeleton } from '../components/UI';
import { ArrowLeft, ExternalLink, GitBranch, Bell, CheckCheck, Trash2, Calendar, Circle, Github, Clock, Tag } from 'lucide-react-native';
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

    const renderItem = ({ item, index }) => {
        const timeAgo = (date) => {
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            if (seconds < 60) return 'now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
            return `${Math.floor(seconds / 86400)}d`;
        };

        return (
            <MotiView
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 250, delay: index * 30 }}
            >
                <TouchableOpacity
                    onPress={() => handleOpenNotification(item)}
                    activeOpacity={0.7}
                    className="mb-3"
                >
                    <View className="bg-white rounded-2xl border-l-4 border-brand overflow-hidden" style={shadowStyles.light}>
                        <View className="p-4 flex-row items-start">
                            {/* Left: Icon + Unread */}
                            <View className="mr-3">
                                <View className="relative">
                                    <View className="w-10 h-10 rounded-xl bg-[#EEF2FF] items-center justify-center overflow-hidden">
                                        {item.repository?.ownerAvatarUrl ? (
                                            <Image
                                                source={{ uri: item.repository.ownerAvatarUrl }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Github size={18} color="#6366F1" fill="none" />
                                        )}
                                    </View>
                                    <View className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-brand border-2 border-white z-20" />
                                </View>
                            </View>

                            {/* Middle: Content */}
                            <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                    <Text className="text-xs font-mono text-muted mr-1" numberOfLines={1}>
                                        {item.repository?.owner}/
                                    </Text>
                                    <Text className="text-xs font-mono text-primary font-semibold" numberOfLines={1}>
                                        {item.repository?.name}
                                    </Text>
                                    <View className="bg-slate-100 rounded px-1.5 py-0.5 ml-2">
                                        <Text className="text-muted text-[10px] font-inter-semibold">{timeAgo(item.createdAt)}</Text>
                                    </View>
                                </View>

                                <Text className="text-sm font-inter-semibold text-primary mb-2 leading-5" numberOfLines={2}>
                                    {item.issueTitle}
                                </Text>

                                <View className="flex-row flex-wrap">
                                    {item.matchedLabels.slice(0, 2).map((label, i) => (
                                        <View key={i} className="bg-brand/10 rounded px-2 py-0.5 mr-1.5 mb-1">
                                            <Text className="text-brand text-[10px] font-inter-bold">{label}</Text>
                                        </View>
                                    ))}
                                    {item.matchedLabels.length > 2 && (
                                        <View className="bg-slate-100 rounded px-2 py-0.5 mb-1">
                                            <Text className="text-muted text-[10px] font-inter-bold">+{item.matchedLabels.length - 2}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Right: Actions */}
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    if (Platform.OS === 'web') {
                                        if (window.confirm('Dismiss notification?')) {
                                            handleDelete(item._id);
                                        }
                                    } else {
                                        Alert.alert(
                                            'Dismiss',
                                            'Remove from Inbox?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Yes', onPress: () => handleDelete(item._id) }
                                            ]
                                        );
                                    }
                                }}
                                className="w-7 h-7 rounded-lg bg-slate-50 items-center justify-center ml-2"
                            >
                                <Trash2 size={14} color="#94A3B8" fill="none" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </MotiView>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Modern Header */}
            <View className="px-6 py-4">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border shadow-sm mr-4"
                            style={shadowStyles.light}
                        >
                            <ArrowLeft size={22} color="#0F172A" fill="none" />
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text className="text-3xl font-poppins-bold text-primary">Inbox</Text>
                            <View className="flex-row items-center mt-1">
                                <View className="w-2 h-2 rounded-full bg-brand mr-2" />
                                <Text className="text-muted text-xs font-inter-semibold uppercase tracking-wider">
                                    {notifs.length} Unread
                                </Text>
                            </View>
                        </View>
                    </View>

                    {notifs.length > 0 && (
                        <TouchableOpacity
                            onPress={handleMarkAllRead}
                            className="w-12 h-12 bg-[#ECFDF5] items-center justify-center rounded-2xl border border-[#D1FAE5]"
                        >
                            <CheckCheck size={22} color="#10B981" fill="none" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats Bar */}
                {notifs.length > 0 && (
                    <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 60 }}
                        className="bg-gradient-to-r from-brand/10 to-accent/10 rounded-2xl p-4 mt-3 border border-brand/20"
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Bell size={16} color="#6366F1" className="mr-2" fill="none" />
                                <Text className="text-primary font-inter-semibold text-sm">
                                    New updates from {new Set(notifs.map(n => n.repository?.name)).size} repositories
                                </Text>
                            </View>
                        </View>
                    </MotiView>
                )}
            </View>

            {loading && (
                <View className="px-6">
                    <ListSkeleton count={5} />
                </View>
            )}

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
                            <Text className="text-primary text-3xl font-poppins-bold text-center mt-6">All Caught Up!</Text>
                            <Text className="text-muted text-base font-inter-medium text-center px-10 mt-2 mb-2 leading-6">
                                No new notifications. We'll alert you when issues matching your filters appear.
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