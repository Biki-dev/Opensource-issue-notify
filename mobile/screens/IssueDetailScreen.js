import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Linking,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { shadowStyles } from '../components/UI';
import {
    ArrowLeft,
    ExternalLink,
    MessageSquare,
    CheckCircle,
    Circle,
    Calendar,
    User,
    Bookmark
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import Markdown from 'react-native-markdown-display';

const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

const isMaintainer = (comment) => comment?.isAuthor;

const markdownStyles = {
    body: {
        color: '#0F172A',
        fontSize: 13,
        lineHeight: 20,
        fontFamily: 'Inter_400Regular'
    },
    heading1: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 16,
        marginBottom: 8,
        fontFamily: 'Poppins_700Bold'
    },
    heading2: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 14,
        marginBottom: 6,
        fontFamily: 'Poppins_600SemiBold'
    },
    code_inline: {
        backgroundColor: '#F1F5F9',
        color: '#6366F1',
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        paddingHorizontal: 4,
        borderRadius: 4
    },
    fence: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    code_block: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 11,
        color: '#0F172A'
    },
    link: {
        color: '#6366F1'
    }
};

const CommentCard = ({ comment }) => (
    <View className="bg-white rounded-3xl p-4 border border-border mb-3" style={shadowStyles.light}>
        <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden mr-3">
                    {comment.authorAvatar ? (
                        <Image source={{ uri: comment.authorAvatar }} className="w-full h-full" resizeMode="cover" />
                    ) : null}
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center mb-0.5">
                        {isMaintainer(comment) && (
                            <View className="bg-amber-100 rounded px-1.5 py-0.5 mr-2">
                                <Text className="text-amber-700 text-[9px] font-inter-bold">MAINTAINER</Text>
                            </View>
                        )}
                        <Text className="text-sm font-inter-bold text-primary" numberOfLines={1}>
                            {comment.author}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Calendar size={11} color="#94A3B8" fill="none" />
                        <Text className="text-[10px] text-muted font-inter-medium ml-1">{formatDate(comment.createdAt)}</Text>
                    </View>
                </View>
            </View>
        </View>

        <Markdown style={markdownStyles}>{comment.body || comment.bodyPreview || ''}</Markdown>

        <View className="flex-row flex-wrap mt-3">
            {[
                ['👍', comment.reactions?.thumbsUp],
                ['❤️', comment.reactions?.heart],
                ['🚀', comment.reactions?.rocket],
                ['🎉', comment.reactions?.hooray],
                ['👀', comment.reactions?.eyes]
            ].filter(([, count]) => count > 0).map(([emoji, count]) => (
                <View key={`${emoji}-${count}`} className="mr-2 mt-2 bg-slate-100 rounded-full px-2 py-1">
                    <Text className="text-[10px] font-inter-bold text-muted">{emoji} {count}</Text>
                </View>
            ))}
        </View>
    </View>
);

const IssueDetailScreen = ({ route, navigation }) => {
    const { trackerId } = route.params;
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [tracker, setTracker] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTracker = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/issue-tracker/${trackerId}`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setTracker(res.data);
        } catch (error) {
            console.log('Fetch issue detail error:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [BASE_URL, trackerId, userToken]);

    useEffect(() => {
        fetchTracker();
    }, [fetchTracker]);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#6366F1" />
            </SafeAreaView>
        );
    }

    if (!tracker) {
        return null;
    }

    const isClosed = tracker.issueState === 'closed';

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border"
                    style={shadowStyles.light}
                >
                    <ArrowLeft size={22} color="#0F172A" fill="none" />
                </TouchableOpacity>

                <View className="flex-1 mx-4">
                    <Text className="text-base font-poppins-bold text-primary" numberOfLines={1}>
                        #{tracker.issueNumber} {tracker.issueTitle}
                    </Text>
                    <Text className="text-[10px] text-muted font-mono" numberOfLines={1}>
                        {tracker.repository?.owner}/{tracker.repository?.name}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => Linking.openURL(tracker.issueUrl)}
                    className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border"
                    style={shadowStyles.light}
                >
                    <ExternalLink size={18} color="#6366F1" fill="none" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTracker(); }} tintColor="#6366F1" />
                }
            >
                <MotiView
                    from={{ opacity: 0, translateY: 14 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                >
                    <View className="bg-white rounded-3xl p-5 mb-4 border border-border" style={shadowStyles.light}>
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center">
                                <View className={`flex-row items-center px-2.5 py-1 rounded-full ${isClosed ? 'bg-danger/10' : 'bg-success/10'}`}>
                                    {isClosed
                                        ? <CheckCircle size={11} color="#EF4444" fill="none" />
                                        : <Circle size={11} color="#10B981" fill="none" />}
                                    <Text className={`text-[10px] font-inter-bold ml-1 ${isClosed ? 'text-danger' : 'text-success'}`}>
                                        {isClosed ? 'Closed' : 'Open'}
                                    </Text>
                                </View>
                                <View className="flex-row items-center ml-2 px-2.5 py-1 rounded-full bg-brand/10">
                                    <MessageSquare size={11} color="#6366F1" fill="none" />
                                    <Text className="text-brand text-[10px] font-inter-bold ml-1">
                                        {tracker.commentCount} comment{tracker.commentCount !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>

                            {tracker.newCommentCount > 0 && (
                                <View className="bg-brand px-2.5 py-1 rounded-full">
                                    <Text className="text-white text-[10px] font-inter-bold">
                                        {tracker.newCommentCount} NEW
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-row items-center mb-3">
                            <View className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden mr-3">
                                {tracker.issueAuthorAvatar ? (
                                    <Image source={{ uri: tracker.issueAuthorAvatar }} className="w-full h-full" resizeMode="cover" />
                                ) : null}
                            </View>
                            <View>
                                <Text className="text-sm font-inter-bold text-primary">{tracker.issueAuthor || 'Unknown author'}</Text>
                                <View className="flex-row items-center mt-0.5">
                                    <User size={11} color="#94A3B8" fill="none" />
                                    <Text className="text-[10px] text-muted font-inter-medium ml-1">Issue author</Text>
                                </View>
                            </View>
                        </View>

                        <Text className="text-base font-poppins-bold text-primary mb-3 leading-6">
                            {tracker.issueTitle}
                        </Text>

                        {!!tracker.issueBody && (
                            <View className="bg-slate-50 rounded-2xl p-4 border border-border/40">
                                <Markdown style={markdownStyles}>{tracker.issueBody}</Markdown>
                            </View>
                        )}
                    </View>
                </MotiView>

                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-poppins-bold text-primary">Conversation</Text>
                    <Text className="text-xs text-muted font-inter-medium">Updated {formatDate(tracker.lastChecked)}</Text>
                </View>

                {(tracker.comments || []).map((comment, index) => (
                    <MotiView
                        key={`${comment.githubCommentId || index}`}
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 220, delay: index * 15 }}
                    >
                        <CommentCard comment={comment} />
                    </MotiView>
                ))}

                {(!tracker.comments || tracker.comments.length === 0) && (
                    <View className="items-center mt-12">
                        <Bookmark size={40} color="#E2E8F0" fill="none" />
                        <Text className="text-primary text-lg font-poppins-bold mt-4">No comments yet</Text>
                        <Text className="text-muted text-sm font-inter-medium text-center px-8 mt-2 leading-5">
                            We’ll keep this thread updated as soon as new activity appears.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default IssueDetailScreen;
