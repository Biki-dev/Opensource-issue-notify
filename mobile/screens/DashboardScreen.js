import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, Linking, Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button, LabelChip, AnimatedMascot, Badge, shadowStyles, SectionHeader, ListSkeleton } from '../components/UI';
import { GitBranch, ExternalLink, Bell, Trash2, Hash, Layers, ChevronRight, Github } from 'lucide-react-native';
import { TriageCard, SeverityBadge, TypeBadge } from '../components/TriageBadge';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import IssueActivityChart from '../components/IssueActivityChart';
const DashboardScreen = ({ navigation }) => {
    const { userToken, BASE_URL, unreadCount, updateUnreadCount } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activityPeriod, setActivityPeriod] = useState('weekly');
    const [selectedRepo, setSelectedRepo] = useState('all');
    const [expandedIssueId, setExpandedIssueId] = useState(null);

    const fetchData = async () => {
        try {
            const [subsRes, notifRes, activityRes] = await Promise.all([
                axios.get(`${BASE_URL}/repos`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${BASE_URL}/repos/activity`, { headers: { Authorization: `Bearer ${userToken}` } }),
            ]);
            setSubs(subsRes.data || []);
            setNotifications(notifRes.data || []);
            setActivity(activityRes?.data?.activity || []);
            updateUnreadCount();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setActivityLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
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

    const handleCopyIssueUrl = async (url) => {
        try {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                await Clipboard.setStringAsync(url);
            }

            Alert.alert('Copied', 'GitHub URL copied to clipboard.');
        } catch (e) {
            console.log(e);
            Alert.alert('Copy failed', 'Unable to copy the GitHub URL right now.');
        }
    };

    const handleShareIssueUrl = async (url) => {
        try {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ url, text: url, title: 'GitHub Issue' });
                return;
            }

            await Share.share({
                message: url,
                url,
                title: 'GitHub Issue'
            });
        } catch (e) {
            console.log(e);
        }
    };

    const handleIssueLongPress = (item) => {
        const url = item.issueUrl;

        if (!url) return;

        Alert.alert('Issue options', 'Choose an action for this GitHub issue.', [
            { text: 'Copy GitHub URL', onPress: () => handleCopyIssueUrl(url) },
            { text: 'Share', onPress: () => handleShareIssueUrl(url) },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const totalLabels = subs.reduce((sum, s) => sum + (s.labels?.length || 0), 0);
    const repoOptions = activity.map(item => ({
        repoId: item.repoId,
        owner: item.owner,
        name: item.name,
    }));

    const handleSwipeDelete = async (item) => {
        await handleDeleteNotification(item._id);
        if (expandedIssueId === item._id) {
            setExpandedIssueId(null);
        }
    };

    const renderDeleteAction = () => (
        <View style={{
            width: 92,
            height: '100%',
            marginHorizontal: 6,
            alignSelf: 'stretch',
            borderRadius: 22,
            backgroundColor: '#FEF2F2',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#FECACA',
            overflow: 'hidden'
        }}>
            <View style={{
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.45)'
            }}>
                <Trash2 size={20} color="#EF4444" fill="none" />
                <Text style={{ marginTop: 6, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#DC2626' }}>
                    Delete
                </Text>
            </View>
        </View>
    );


    // const getSeverityAccent = (severity) => {
    //     const map = {
    //         critical: '#DC2626',
    //         high: '#EA580C',
    //         medium: '#CA8A04',
    //         low: '#16A34A'
    //     };
    //     return map[severity] || '#6366F1';
    // };

    const renderIssue = ({ item, index }) => {
        // const accentColor = getSeverityAccent(item.aiTriage?.severity);
        const isExpanded = expandedIssueId === item._id;

        return (
            <MotiView
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 280, delay: index * 30 }}
            >
                <Swipeable
                    renderRightActions={renderDeleteAction}
                    overshootRight={false}
                    friction={2}
                    rightThreshold={48}
                    onSwipeableOpen={() => handleSwipeDelete(item)}
                >
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        marginBottom: 10,
                        borderLeftWidth: 1,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        overflow: 'hidden',
                        ...shadowStyles.light
                    }}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setExpandedIssueId(prev => prev === item._id ? null : item._id)}
                            style={{ padding: 14 }}
                        >
                            {/* Top row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{
                                    width: 32, height: 32,
                                    borderRadius: 10,
                                    backgroundColor: '#F8FAFC',
                                    overflow: 'hidden',
                                    marginRight: 10,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0'
                                }}>
                                    {item.repository?.ownerAvatarUrl ? (
                                        <Image
                                            source={{ uri: item.repository.ownerAvatarUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Github size={16} color="#6366F1" />
                                        </View>
                                    )}
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'JetBrainsMono_400Regular' }} numberOfLines={1}>
                                        {item.repository?.owner}/{item.repository?.name}
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 10, color: '#CBD5E1', fontFamily: 'Inter_500Medium', marginRight: 6 }}>
                                        {item.createdAt ? timeAgo(item.createdAt) : ''}
                                    </Text>
                                    <MotiView
                                        animate={{ rotate: isExpanded ? '90deg' : '0deg' }}
                                        transition={{ type: 'timing', duration: 180 }}
                                    >
                                        <ChevronRight size={16} color="#CBD5E1" />
                                    </MotiView>
                                </View>
                            </View>

                            {/* Title */}
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'Poppins_600SemiBold',
                                color: '#0F172A',
                                lineHeight: 20,
                                marginBottom: 8
                            }} numberOfLines={isExpanded ? undefined : 2}>
                                {item.aiTriage?.summary || item.issueTitle}
                            </Text>

                            {/* Badges row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                {item.aiTriage?.severity && <SeverityBadge severity={item.aiTriage.severity} />}
                                {item.aiTriage?.type && <TypeBadge type={item.aiTriage.type} />}
                                {item.matchedLabels?.slice(0, 2).map((l, i) => (
                                    <View key={i} style={{
                                        backgroundColor: '#EEF2FF',
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        borderRadius: 20
                                    }}>
                                        <Text style={{ fontSize: 10, color: '#6366F1', fontFamily: 'Inter_600SemiBold' }}>
                                            {l}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </TouchableOpacity>

                        {/* Expanded section */}
                        {isExpanded && (
                            <MotiView
                                from={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ type: 'timing', duration: 200 }}
                                style={{
                                    borderTopWidth: 1,
                                    borderTopColor: '#F1F5F9',
                                    padding: 14,
                                    paddingTop: 12
                                }}
                            >
                                {item.aiTriage?.reasoning && !item.aiTriage.isFallback && (
                                    <Text style={{
                                        fontSize: 12,
                                        color: '#64748B',
                                        fontFamily: 'Inter_400Regular',
                                        fontStyle: 'italic',
                                        marginBottom: 12,
                                        lineHeight: 18
                                    }}>
                                        {item.aiTriage.reasoning}
                                    </Text>
                                )}
                                <Button
                                    title="View on GitHub"
                                    variant="outline"
                                    icon={ExternalLink}
                                    onPress={() => Linking.openURL(item.issueUrl)}
                                    size="sm"
                                />
                            </MotiView>
                        )}
                    </View>
                </Swipeable>
            </MotiView>
        );
    };

    // Add timeAgo helper inside DashboardScreen (above renderIssue):
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    };
    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 pt-4 pb-4 flex-row justify-between items-center">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                >
                    <Text className="text-2xl font-poppins-bold text-primary">Dashboard</Text>
                </MotiView>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    className="w-12 h-12 rounded-2xl bg-white border border-border items-center justify-center shadow-sm"
                    style={shadowStyles.light}
                >
                    <Bell size={22} color="#0F172A" fill="none" />
                    {unreadCount > 0 && <View className="absolute top-2.5 right-2.5 w-3 h-3 bg-danger rounded-full border-2 border-white" />}
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
                ListFooterComponent={loading ? <ListSkeleton count={2} containerStyle={{ paddingHorizontal: 24, marginTop: 10 }} /> : null}
                ListHeaderComponent={() => (
                    <View>
                        <View className="mt-4 mb-2">
                            {/* Hero Stats Card */}
                            <MotiView
                                from={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'timing', duration: 400, delay: 200 }}
                            >

                                <View className="p-0 overflow-hidden mb-8" style={{
                                    backgroundColor: "transparent",
                                    borderWidth: 0,
                                    shadowColor: "transparent",
                                    shadowOpacity: 0,
                                    shadowRadius: 0,
                                    shadowOffset: { width: 0, height: 0 },
                                    elevation: 0,
                                }}>
                                    <LinearGradient
                                        colors={['#6366F1', '#8B5CF6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{ borderRadius: 24 }}
                                    >
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
                                    </LinearGradient>
                                </View>
                            </MotiView>

                            <IssueActivityChart
                                data={activity}
                                loading={activityLoading}
                                period={activityPeriod}
                                setPeriod={setActivityPeriod}
                                selectedRepo={selectedRepo}
                                setSelectedRepo={setSelectedRepo}
                                repoOptions={repoOptions}
                            />

                            <SectionHeader
                                title="Recent Issues"
                                icon={Layers}
                                action={<Text className="text-xs text-muted font-inter-medium">{loading ? "..." : notifications.length} total</Text>}
                            />
                        </View>
                    </View>
                )}
                ListEmptyComponent={!loading && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="items-center"
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
                            className="mt-6 self-center"
                        />
                    </MotiView>
                )}
            />
        </SafeAreaView>
    );
};

export default DashboardScreen;
