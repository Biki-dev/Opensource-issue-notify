import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, Linking, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button, LabelChip, AnimatedMascot, Badge, shadowStyles, SectionHeader } from '../components/UI';
import { GitBranch, ExternalLink, Bell, Trash2, Hash, Layers, ChevronRight, Github } from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';

const DashboardScreen = ({ navigation }) => {
    const { userToken, BASE_URL, unreadCount, updateUnreadCount } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [subsRes, notifRes] = await Promise.all([
                axios.get(`${BASE_URL}/repos`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${userToken}` } }),
            ]);
            setSubs(subsRes.data || []);
            setNotifications(notifRes.data || []);
            updateUnreadCount();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchData);
        return unsubscribe;
    }, [navigation]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

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
            from={{ opacity: 0, translateY: 30, scale: 0.9 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: index * 100 }}
        >
            <Card className="mb-6 p-6">
                <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3 overflow-hidden">
                            {item.repository?.ownerAvatarUrl ? (
                                <Image
                                    source={{ uri: item.repository.ownerAvatarUrl }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Github size={20} color="#6366F1" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-muted font-mono" numberOfLines={1}>
                                {item.repository?.owner}
                            </Text>
                            <Text className="text-sm text-primary font-poppins-semibold" numberOfLines={1}>
                                {item.repository?.name}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                if (window.confirm('Are you sure you want to delete this notification?')) {
                                    handleDeleteNotification(item._id);
                                }
                            } else {
                                Alert.alert(
                                    'Remove Update',
                                    'Are you sure you want to delete this notification?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteNotification(item._id) }
                                    ]
                                );
                            }
                        }}
                        className="w-10 h-10 items-center justify-center rounded-full bg-danger/10"
                    >
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                <Text className="text-lg font-poppins-semibold text-primary mb-3 leading-6" numberOfLines={3}>
                    {item.issueTitle}
                </Text>

                <View className="flex-row flex-wrap mb-6">
                    {item.matchedLabels.map((l, i) => (
                        <LabelChip key={i} label={l} selected />
                    ))}
                </View>

                <Button
                    title="View on GitHub"
                    variant="outline"
                    icon={ExternalLink}
                    onPress={() => Linking.openURL(`https://github.com/${item.repository?.owner}/${item.repository?.name}/issues/${item.issueNumber}`)}
                    className="h-14"
                />
            </Card>
        </MotiView>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 pt-4 pb-4 flex-row justify-between items-center">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                >
                    <Text className="text-4xl font-poppins-bold text-primary">Dashboard</Text>
                </MotiView>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    className="w-14 h-14 rounded-2xl bg-white border border-border items-center justify-center"
                    style={shadowStyles.light}
                >
                    <Bell size={26} color="#0F172A" />
                    {unreadCount > 0 && <Badge count={unreadCount} className="-top-1 -right-1" />}
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item._id}
                renderItem={renderIssue}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                }
                ListHeaderComponent={
                    <View className="mt-4 mb-2">
                        {/* Hero Stats Card */}
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', damping: 15, delay: 200 }}
                        >
                            <Card className="p-0 overflow-hidden mb-8" containerStyle={{ backgroundColor: '#6366F1' }}>
                                <View className="p-6 flex-row justify-between items-center">
                                    <View className="flex-1 items-center border-r border-white/20">
                                        <Text className="text-3xl font-poppins-bold text-white">{subs.length}</Text>
                                        <Text className="text-[10px] uppercase font-poppins-bold text-white/70">Repos</Text>
                                    </View>
                                    <View className="flex-1 items-center border-r border-white/20">
                                        <Text className="text-3xl font-poppins-bold text-white">{notifications.length}</Text>
                                        <Text className="text-[10px] uppercase font-poppins-bold text-white/70">Issues</Text>
                                    </View>
                                    <View className="flex-1 items-center">
                                        <Text className="text-3xl font-poppins-bold text-white">{totalLabels}</Text>
                                        <Text className="text-[10px] uppercase font-poppins-bold text-white/70">Labels</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('SubscriptionsTab')}
                                    className="bg-white/10 py-3 flex-row items-center justify-center"
                                >
                                    <Text className="text-white font-inter-semibold text-xs">Manage Subscriptions</Text>
                                    <ChevronRight size={14} color="white" className="ml-1" />
                                </TouchableOpacity>
                            </Card>
                        </MotiView>

                        <SectionHeader
                            title="Recent Issues"
                            icon={Layers}
                            action={<Text className="text-xs text-muted font-inter-medium">{notifications.length} total</Text>}
                        />
                    </View>
                }
                ListEmptyComponent={!loading && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="items-center mt-8"
                    >
                        <AnimatedMascot
                            source={require('../maskot/add.png')}
                            style={{ width: 280, height: 280 }}
                        />
                        <Text className="text-primary text-2xl font-poppins-bold text-center mt-4">All Clear!</Text>
                        <Text className="text-muted text-base font-inter-medium text-center px-10 mt-2 leading-6">
                            No new issues found for your tracked labels. We'll notify you as soon as they appear.
                        </Text>
                        <Button
                            title="Add Repositories"
                            variant="ghost"
                            icon={GitBranch}
                            onPress={() => navigation.navigate('SubscriptionsTab')}
                            className="mt-6"
                        />
                    </MotiView>
                )}
            />
        </SafeAreaView>
    );
};

export default DashboardScreen;
