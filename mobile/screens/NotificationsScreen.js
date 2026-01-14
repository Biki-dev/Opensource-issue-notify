import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card } from '../components/UI';
import { ArrowLeft, ExternalLink, GitBranch, Bell, CheckCheck, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';

const NotificationsScreen = ({ navigation }) => {
    const { userToken, BASE_URL, updateUnreadCount } = useContext(AuthContext);
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifs = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/notifications`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            // Show all but sorted by date? Or just unread as before.
            // Keeping the filtering to unread for this specific "Inbox" screen
            const unread = (res.data || []).filter(n => !n.isRead);
            setNotifs(unread);
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
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
            await axios.delete(`${BASE_URL}/notifications/${id}`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setNotifs(prev => prev.filter(n => n._id !== id));
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        }
    };

    const renderItem = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: 100 * (index % 10) }}
        >
            <TouchableOpacity onPress={() => handleOpenNotification(item)} activeOpacity={0.7}>
                <Card className="mb-4">
                    <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-row items-center flex-1">
                            <GitBranch size={16} color="#55607780" className="mr-2" />
                            <Text className="text-sm text-muted font-medium" numberOfLines={1}>
                                {item.repository?.owner}/{item.repository?.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(item._id);
                        }}>
                            <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-lg font-bold text-primary mb-3">{item.issueTitle}</Text>

                    <View className="flex-row flex-wrap mb-4">
                        {item.matchedLabels.map((l, i) => (
                            <View key={i} className="bg-brand/5 px-3 py-1.5 rounded-full mr-2 mb-2 border border-brand/10">
                                <Text className="text-xs text-brand font-bold">#{l}</Text>
                            </View>
                        ))}
                    </View>

                    <View className="flex-row items-center pt-2 border-t border-border/50">
                        <Text className="text-brand font-bold text-sm mr-2">View Issue</Text>
                        <ExternalLink size={14} color="#D97706" />
                    </View>
                </Card>
            </TouchableOpacity>
        </MotiView>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 py-4 flex-row items-center justify-between bg-background border-b border-border">
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 mr-4 items-center justify-center rounded-xl bg-card border border-border shadow-sm shadow-black/5"
                    >
                        <ArrowLeft size={20} color="#0F172A" />
                    </TouchableOpacity>
                    <Text className="text-xl font-black text-primary">Notifications</Text>
                    <View className="bg-brand/10 px-2.5 py-1 rounded-full ml-3 border border-brand/20">
                        <Text className="text-brand text-xs font-black">{notifs.length}</Text>
                    </View>
                </View>

                {notifs.length > 0 && (
                    <TouchableOpacity
                        onPress={handleMarkAllRead}
                        className="flex-row items-center bg-brand/10 px-4 py-2 rounded-xl border border-brand/20"
                    >
                        <CheckCheck size={16} color="#D97706" className="mr-2" />
                        <Text className="text-brand text-xs font-black uppercase tracking-wider">Mark all</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifs}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                ListEmptyComponent={
                    !loading && (
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="items-center py-20"
                        >
                            <View className="w-24 h-24 rounded-full bg-white border border-border items-center justify-center mb-6 shadow-xl shadow-black/5">
                                <Bell size={40} color="#D97706" />
                            </View>
                            <Text className="text-primary text-xl font-black mb-2">All caught up!</Text>
                            <Text className="text-muted text-sm font-medium text-center px-10 leading-5">
                                No new notifications. We'll let you know when matching issues are found.
                            </Text>
                        </MotiView>
                    )
                }
            />
        </SafeAreaView>
    );
};

export default NotificationsScreen;
