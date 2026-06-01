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

    const renderIssue = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 15, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 300, delay: index * 35 }}
        >
            <Swipeable
                renderLeftActions={renderDeleteAction}
                renderRightActions={renderDeleteAction}
                overshootLeft={false}
                overshootRight={false}
                friction={2}
                leftThreshold={48}
                rightThreshold={48}
                onSwipeableOpen={() => handleSwipeDelete(item)}
            >
                <Card className="p-4 overflow-hidden">
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setExpandedIssueId(prev => (prev === item._id ? null : item._id))}
                    >
                        <View className="flex-row justify-between items-start">
                            <View className="flex-row items-center flex-1 mr-3">
                                <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3 overflow-hidden">
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
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <Text className="text-[11px] text-muted font-mono" numberOfLines={1}>
                                            {item.repository?.owner}
                                        </Text>
                                        <Text className="text-[11px] text-muted font-mono mx-1">/</Text>
                                        <Text className="text-[11px] text-primary font-poppins-semibold" numberOfLines={1}>
                                            {item.repository?.name}
                                        </Text>
                                        <View className="bg-slate-100 rounded-full px-2 py-0.5 ml-2">
                                            <Text className="text-muted text-[10px] font-inter-semibold">{item.createdAt ? `${(new Date() - new Date(item.createdAt)) < 3600000 ? `${Math.max(1, Math.floor((new Date() - new Date(item.createdAt)) / 60000))}m` : `${Math.floor((new Date() - new Date(item.createdAt)) / 3600000)}h`} ago` : ''}</Text>
                                        </View>
                                    </View>
                                    <Text className="text-base font-poppins-semibold text-primary leading-5" numberOfLines={2}>
                                        {item.aiTriage?.summary || item.issueTitle}
                                    </Text>
                                </View>
                            </View>

                            <MotiView
                                animate={{ rotate: expandedIssueId === item._id ? '90deg' : '0deg' }}
                                transition={{ type: 'timing', duration: 180 }}
                                style={{ marginTop: 6 }}
                            >
                                <ChevronRight size={18} color="#94A3B8" fill="none" />
                            </MotiView>
                        </View>

                        <View className="flex-row items-center mt-3 flex-wrap">
                            {item.aiTriage?.severity && <SeverityBadge severity={item.aiTriage.severity} />}
                            {item.aiTriage?.type && <TypeBadge type={item.aiTriage.type} />}
                         
                        </View>
                    </TouchableOpacity>

                    {expandedIssueId === item._id && (
                        <MotiView
                            from={{ opacity: 0, translateY: -6 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 220 }}
                            className="mt-3 pt-3 border-t border-slate-100"
                        >
                            {item.aiTriage && (
                                <View className="mb-3">
                                    <TriageCard triage={item.aiTriage} />
                                </View>
                            )}

                            <View className="flex-row flex-wrap mb-4">
                                {(item.matchedLabels || []).map((l, i) => (
                                    <LabelChip key={i} label={l} selected />
                                ))}
                            </View>

                            <Button
                                title="View on GitHub"
                                variant="outline"
                                icon={ExternalLink}
                                onPress={() => Linking.openURL(item.issueUrl)}
                                onLongPress={() => handleIssueLongPress(item)}
                                delayLongPress={250}
                                className="h-12"
                            />
                        </MotiView>
                    )}
                </Card>
            </Swipeable>
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
