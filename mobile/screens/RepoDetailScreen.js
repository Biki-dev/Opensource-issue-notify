import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Linking, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { shadowStyles } from '../components/UI';
import {
    ArrowLeft, Star, GitFork, Eye, AlertCircle,
    GitPullRequest, ExternalLink, RefreshCw, Lock,
    Globe, Tag, Calendar, Code2
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import Markdown from 'react-native-markdown-display';

const StatCard = ({ icon: Icon, label, value, color = '#6366F1' }) => (
    <View className="flex-1 items-center bg-white rounded-2xl p-4 border border-border mx-1"
        style={shadowStyles.light}>
        <Icon size={20} color={color} fill="none" />
        <Text className="text-lg font-poppins-bold text-primary mt-2">
            {formatNumber(value)}
        </Text>
        <Text className="text-[10px] text-muted font-inter-bold uppercase tracking-wider mt-0.5">
            {label}
        </Text>
    </View>
);

const formatNumber = (n) => {
    if (n === null || n === undefined) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
};

const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
};

const RepoDetailScreen = ({ route, navigation }) => {
    const { subscriptionId } = route.params;
    const { userToken, BASE_URL } = useContext(AuthContext);

    const [repo, setRepo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshingData, setRefreshingData] = useState(false);
    const [showFullReadme, setShowFullReadme] = useState(false);

    const fetchDetails = useCallback(async () => {
        try {
            const res = await axios.get(
                `${BASE_URL}/repos/${subscriptionId}/details`,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setRepo(res.data);
        } catch (e) {
            console.log('Fetch repo details error:', e.message);
            Alert.alert('Error', 'Could not load repository details.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [subscriptionId, userToken, BASE_URL]);

    useEffect(() => {
        fetchDetails();
    }, []);

    const handleRefreshData = async () => {
        setRefreshingData(true);
        try {
            await axios.post(
                `${BASE_URL}/repos/${subscriptionId}/refresh`,
                {},
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            await fetchDetails();
            Alert.alert('Updated', 'Repository data has been refreshed.');
        } catch (e) {
            const message = e.response?.data?.message || 'Refresh failed';
            Alert.alert('Could not refresh', message);
        } finally {
            setRefreshingData(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDetails();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#6366F1" />
            </SafeAreaView>
        );
    }

    if (!repo) return null;

    const githubRepoUrl = `https://github.com/${repo.owner}/${repo.name}`;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
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
                        {repo.owner}/{repo.name}
                    </Text>
                    {repo.isPrivate && (
                        <View className="flex-row items-center mt-0.5">
                            <Lock size={10} color="#94A3B8" />
                            <Text className="text-muted text-[10px] ml-1 font-inter-medium">Private</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={handleRefreshData}
                    disabled={refreshingData}
                    className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border"
                    style={shadowStyles.light}
                >
                    {refreshingData
                        ? <ActivityIndicator size="small" color="#6366F1" />
                        : <RefreshCw size={20} color="#6366F1" fill="none" />}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                }
            >
                {/* Identity Card */}
                <MotiView
                    from={{ opacity: 0, translateY: 16 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350 }}
                >
                    <View className="bg-white rounded-3xl p-6 mb-5 border border-border"
                        style={shadowStyles.light}>
                        <View className="flex-row items-center mb-4">
                            <View className="w-16 h-16 rounded-2xl overflow-hidden mr-4 bg-slate-100">
                                {repo.ownerAvatarUrl
                                    ? <Image source={{ uri: repo.ownerAvatarUrl }}
                                        className="w-full h-full" resizeMode="cover" />
                                    : <View className="w-full h-full items-center justify-center">
                                        <Code2 size={28} color="#6366F1" fill="none" />
                                    </View>
                                }
                            </View>
                            <View className="flex-1">
                                <Text className="text-xl font-poppins-bold text-primary">
                                    {repo.name}
                                </Text>
                                <Text className="text-sm text-muted font-inter-medium">
                                    by {repo.owner}
                                </Text>
                                {repo.language && (
                                    <View className="flex-row items-center mt-2">
                                        <View className="w-2.5 h-2.5 rounded-full bg-brand mr-1.5" />
                                        <Text className="text-xs text-muted font-inter-medium">
                                            {repo.language}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {repo.description && (
                            <Text className="text-sm text-muted font-inter-medium leading-5 mb-4">
                                {repo.description}
                            </Text>
                        )}

                        {/* Topics */}
                        {repo.topics?.length > 0 && (
                            <View className="flex-row flex-wrap mb-4">
                                {repo.topics.slice(0, 6).map(topic => (
                                    <View key={topic}
                                        className="bg-brand/10 rounded-full px-3 py-1 mr-2 mb-2 border border-brand/20">
                                        <Text className="text-brand text-[10px] font-inter-bold">
                                            {topic}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Meta row */}
                        <View className="flex-row flex-wrap">
                            {repo.license && (
                                <View className="flex-row items-center mr-4 mb-1">
                                    <Tag size={12} color="#94A3B8" fill="none" />
                                    <Text className="text-muted text-xs ml-1 font-inter-medium">
                                        {repo.license}
                                    </Text>
                                </View>
                            )}
                            {repo.repoCreatedAt && (
                                <View className="flex-row items-center mr-4 mb-1">
                                    <Calendar size={12} color="#94A3B8" fill="none" />
                                    <Text className="text-muted text-xs ml-1 font-inter-medium">
                                        Created {formatDate(repo.repoCreatedAt)}
                                    </Text>
                                </View>
                            )}
                            {repo.pushedAt && (
                                <View className="flex-row items-center mb-1">
                                    <Calendar size={12} color="#10B981" fill="none" />
                                    <Text className="text-success text-xs ml-1 font-inter-medium">
                                        Updated {timeAgo(repo.pushedAt)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </MotiView>

                {/* Stats Row */}
                <MotiView
                    from={{ opacity: 0, translateY: 16 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 80 }}
                    className="flex-row mb-5"
                    style={{ marginHorizontal: -4 }}
                >
                    <StatCard icon={Star} label="Stars" value={repo.stars} color="#F59E0B" />
                    <StatCard icon={GitFork} label="Forks" value={repo.forks} color="#6366F1" />
                    <StatCard icon={Eye} label="Watchers" value={repo.watchers} color="#8B5CF6" />
                </MotiView>

                <MotiView
                    from={{ opacity: 0, translateY: 16 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 120 }}
                    className="flex-row mb-5"
                    style={{ marginHorizontal: -4 }}
                >
                    <StatCard icon={AlertCircle} label="Issues" value={repo.openIssuesCount} color="#EF4444" />
                    <StatCard icon={GitPullRequest} label="Pull Requests" value={repo.openPRsCount} color="#10B981" />
                </MotiView>

                {/* Subscription Info */}
                <MotiView
                    from={{ opacity: 0, translateY: 16 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 160 }}
                >
                    <View className="bg-brand/5 rounded-3xl p-5 mb-5 border border-brand/20">
                        <Text className="text-sm font-poppins-bold text-primary mb-3">
                            Your Subscription
                        </Text>
                        <Text className="text-xs text-muted font-inter-bold uppercase tracking-wider mb-2">
                            Tracked Labels
                        </Text>
                        <View className="flex-row flex-wrap mb-3">
                            {repo.labels?.map(label => (
                                <View key={label}
                                    className="bg-brand/10 rounded-full px-3 py-1 mr-2 mb-2 border border-brand/20">
                                    <Text className="text-brand text-xs font-inter-bold">{label}</Text>
                                </View>
                            ))}
                        </View>
                        {repo.keywords?.length > 0 && (
                            <>
                                <Text className="text-xs text-muted font-inter-bold uppercase tracking-wider mb-2">
                                    Keywords
                                </Text>
                                <Text className="text-sm text-primary font-inter-medium">
                                    {repo.keywords.join(', ')}
                                </Text>
                            </>
                        )}
                    </View>
                </MotiView>

                {/* README */}
                {repo.readmeContent && (
                    <MotiView
                        from={{ opacity: 0, translateY: 16 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 200 }}
                    >
                        <View className="bg-white rounded-3xl p-5 mb-5 border border-border"
                            style={shadowStyles.light}>
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-base font-poppins-bold text-primary">
                                    README
                                </Text>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(
                                        `${githubRepoUrl}/blob/${repo.defaultBranch}/README.md`
                                    )}
                                    className="flex-row items-center"
                                >
                                    <Text className="text-brand text-xs font-inter-semibold mr-1">
                                        View on GitHub
                                    </Text>
                                    <ExternalLink size={12} color="#6366F1" fill="none" />
                                </TouchableOpacity>
                            </View>

                            <View style={showFullReadme ? {} : { maxHeight: 400, overflow: 'hidden' }}>
                                <Markdown style={markdownStyles}>
                                    {repo.readmeContent}
                                </Markdown>
                            </View>

                            {!showFullReadme && (
                                <TouchableOpacity
                                    onPress={() => setShowFullReadme(true)}
                                    className="mt-3 py-3 bg-slate-50 rounded-xl border border-border items-center"
                                >
                                    <Text className="text-brand font-inter-semibold text-sm">
                                        Show full README
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </MotiView>
                )}

                {/* Open on GitHub */}
                <MotiView
                    from={{ opacity: 0, translateY: 16 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 240 }}
                >
                    <TouchableOpacity
                        onPress={() => Linking.openURL(githubRepoUrl)}
                        className="flex-row items-center justify-center bg-[#24292F] rounded-2xl py-4 mb-4"
                        style={shadowStyles.medium}
                    >
                        <Code2 size={20} color="white" fill="none" />
                        <Text className="text-white font-poppins-semibold text-base ml-3">
                            Open on GitHub
                        </Text>
                    </TouchableOpacity>

                    {repo.homepageUrl && (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(repo.homepageUrl)}
                            className="flex-row items-center justify-center bg-white rounded-2xl py-4 border border-border"
                            style={shadowStyles.light}
                        >
                            <Globe size={18} color="#6366F1" fill="none" />
                            <Text className="text-brand font-inter-semibold text-sm ml-2">
                                Visit Homepage
                            </Text>
                        </TouchableOpacity>
                    )}

                    {repo.metadataFetchedAt && (
                        <Text className="text-center text-muted text-[10px] font-inter-medium mt-4">
                            Data cached {timeAgo(repo.metadataFetchedAt)} · Tap ↻ to refresh
                        </Text>
                    )}
                </MotiView>
            </ScrollView>
        </SafeAreaView>
    );
};

// Markdown renderer styles
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
    heading3: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 12,
        marginBottom: 4
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
    blockquote: {
        backgroundColor: '#F1F5F9',
        borderLeftWidth: 3,
        borderLeftColor: '#6366F1',
        paddingLeft: 12,
        paddingVertical: 4,
        marginVertical: 8,
        borderRadius: 4
    },
    link: {
        color: '#6366F1'
    },
    hr: {
        backgroundColor: '#E2E8F0',
        height: 1,
        marginVertical: 12
    }
};

export default RepoDetailScreen;
