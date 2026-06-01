import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { shadowStyles, ListSkeleton } from '../components/UI';
import {
    Bookmark,
    MessageSquare,
    CheckCircle,
    Circle,
    ExternalLink,
    Trash2,
    ArrowRight
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';

const TrackerCard = ({ item, onUnfollow, onPress }) => {
    const hasNew = item.newCommentCount > 0;
    const isClosed = item.issueState === 'closed';

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250 }}
        >
            <TouchableOpacity
                onPress={onPress}
                className={`bg-white rounded-3xl mb-3 overflow-hidden border ${hasNew ? 'border-brand' : 'border-border'}`}
                style={shadowStyles.light}
                activeOpacity={0.85}
            >
                {hasNew && (
                    <View className="bg-brand px-3 py-1.5 flex-row items-center">
                        <MessageSquare size={10} color="white" fill="none" />
                        <Text className="text-white text-[10px] font-inter-bold ml-1">
                            {item.newCommentCount} new comment{item.newCommentCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}

                <View className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 mr-2">
                            <View className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 mr-2">
                                {item.repository?.ownerAvatarUrl ? (
                                    <Image
                                        source={{ uri: item.repository.ownerAvatarUrl }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : null}
                            </View>
                            <Text className="text-[10px] text-muted font-mono" numberOfLines={1}>
                                {item.repository?.owner}/{item.repository?.name}
                            </Text>
                        </View>

                        <View className={`flex-row items-center px-2 py-0.5 rounded-full ${isClosed ? 'bg-danger/10' : 'bg-success/10'}`}>
                            {isClosed
                                ? <CheckCircle size={10} color="#EF4444" fill="none" />
                                : <Circle size={10} color="#10B981" fill="none" />}
                            <Text className={`text-[9px] font-inter-bold ml-1 ${isClosed ? 'text-danger' : 'text-success'}`}>
                                {isClosed ? 'Closed' : 'Open'}
                            </Text>
                        </View>
                    </View>

                    <Text className="text-sm font-poppins-bold text-primary mb-2 leading-5" numberOfLines={2}>
                        #{item.issueNumber} {item.issueTitle}
                    </Text>

                    {!!item.lastComment ? (
                        <View className="bg-slate-50 rounded-2xl p-3 mb-3 border border-border/40">
                            <View className="flex-row items-center mb-1.5">
                                {item.lastComment.isAuthor && (
                                    <View className="bg-amber-100 rounded px-1.5 py-0.5 mr-2">
                                        <Text className="text-amber-700 text-[9px] font-inter-bold">MAINTAINER</Text>
                                    </View>
                                )}
                                <Text className="text-[10px] text-muted font-inter-bold">{item.lastComment.author}</Text>
                            </View>
                            <Text className="text-xs text-muted font-inter-medium leading-4" numberOfLines={2}>
                                {item.lastComment.bodyPreview}
                            </Text>
                        </View>
                    ) : (
                        <View className="bg-slate-50 rounded-2xl p-3 mb-3 border border-border/40">
                            <Text className="text-xs text-muted font-inter-medium leading-4" numberOfLines={2}>
                                {item.issueBodyPreview || 'No comment preview yet.'}
                            </Text>
                        </View>
                    )}

                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                            <MessageSquare size={12} color="#94A3B8" fill="none" />
                            <Text className="text-muted text-[10px] ml-1 font-inter-medium">
                                {item.commentCount} comment{item.commentCount !== 1 ? 's' : ''}
                            </Text>
                            <ArrowRight size={11} color="#CBD5E1" fill="none" className="ml-2" />
                        </View>

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => Linking.openURL(item.issueUrl)}
                                className="w-8 h-8 rounded-lg bg-slate-50 border border-border items-center justify-center mr-2"
                                activeOpacity={0.8}
                            >
                                <ExternalLink size={12} color="#6366F1" fill="none" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => onUnfollow(item._id)}
                                className="w-8 h-8 rounded-lg bg-danger/10 items-center justify-center"
                                activeOpacity={0.8}
                            >
                                <Trash2 size={12} color="#EF4444" fill="none" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </MotiView>
    );
};

const TrackedIssuesScreen = ({ navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [trackers, setTrackers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTrackers = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/issue-tracker`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setTrackers(res.data || []);
        } catch (error) {
            console.log('Fetch tracked issues error:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [BASE_URL, userToken]);

    useEffect(() => {
        fetchTrackers();
        const unsubscribe = navigation.addListener('focus', fetchTrackers);
        return unsubscribe;
    }, [navigation, fetchTrackers]);

    const handleUnfollow = (id) => {
        Alert.alert('Unfollow issue', 'Stop tracking comments on this issue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Unfollow',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await axios.delete(`${BASE_URL}/issue-tracker/${id}`, {
                            headers: { Authorization: `Bearer ${userToken}` }
                        });
                        setTrackers(prev => prev.filter(tracker => tracker._id !== id));
                    } catch (error) {
                        Alert.alert('Could not unfollow', 'Please try again.');
                    }
                }
            }
        ]);
    };

    const handleOpenDetail = (tracker) => {
        navigation.navigate('IssueDetail', { trackerId: tracker._id });
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            <View className="px-6 pt-4 pb-2">
                <Text className="text-2xl font-poppins-bold text-primary">Following</Text>
                <Text className="text-muted text-xs font-inter-medium mt-1">
                    Issues you're tracking for new activity
                </Text>
            </View>

            {loading ? (
                <View className="px-6">
                    <ListSkeleton count={3} />
                </View>
            ) : (
                <FlatList
                    data={trackers}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => (
                        <TrackerCard
                            item={item}
                            onUnfollow={handleUnfollow}
                            onPress={() => handleOpenDetail(item)}
                        />
                    )}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrackers(); }} tintColor="#6366F1" />
                    }
                    ListEmptyComponent={
                        <MotiView
                            from={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="items-center mt-16"
                        >
                            <Bookmark size={48} color="#E2E8F0" fill="none" />
                            <Text className="text-primary text-xl font-poppins-bold text-center mt-6">
                                No followed issues
                            </Text>
                            <Text className="text-muted text-sm font-inter-medium text-center px-10 mt-2 leading-5">
                                Use “Follow this issue” from Inbox to track comments here.
                            </Text>
                        </MotiView>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default TrackedIssuesScreen;
