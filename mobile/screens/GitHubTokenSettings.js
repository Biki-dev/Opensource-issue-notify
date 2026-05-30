import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card, Skeleton, shadowStyles } from '../components/UI';
import { ArrowLeft, Github, Key, CheckCircle, AlertTriangle, ExternalLink, Lock, Zap, Eye, Clock } from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';

const GitHubTokenSettings = ({ navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [token, setToken] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showToken, setShowToken] = useState(false);

    useEffect(() => {
        const loadTokenStatus = async () => {
            setLoading(true);
            await fetchTokenStatus();
        };

        loadTokenStatus();
    }, []);

    const fetchTokenStatus = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/user/token/github-token/status`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setStatus(res.data);
        } catch (e) {
            console.log('Error fetching token status:', e);
        } finally {
            setLoading(false);
        }
    };

    const StatusCardSkeleton = () => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
        >
            <Card className="p-6 mb-6 border-2 border-brand/20">
                <View className="flex-row items-center mb-4">
                    <Skeleton width={48} height={48} radius={16} className="mr-3" />
                    <View className="flex-1">
                        <Skeleton width="36%" height={14} radius={6} className="mb-2" />
                        <Skeleton width="54%" height={10} radius={5} />
                    </View>
                </View>

                <View className="flex-row flex-wrap">
                    <View className="w-1/2 pr-2 mb-3">
                        <View className="flex-row items-center mb-2">
                            <Skeleton width={14} height={14} radius={7} className="mr-2" />
                            <Skeleton width="48%" height={10} radius={4} />
                        </View>
                        <Skeleton width="68%" height={14} radius={5} />
                    </View>

                    <View className="w-1/2 pl-2 mb-3">
                        <View className="flex-row items-center mb-2">
                            <Skeleton width={14} height={14} radius={7} className="mr-2" />
                            <Skeleton width="42%" height={10} radius={4} />
                        </View>
                        <Skeleton width="58%" height={14} radius={5} />
                    </View>

                    <View className="w-1/2 pr-2">
                        <View className="flex-row items-center mb-2">
                            <Skeleton width={14} height={14} radius={7} className="mr-2" />
                            <Skeleton width="36%" height={10} radius={4} />
                        </View>
                        <Skeleton width="46%" height={14} radius={5} />
                    </View>

                    <View className="w-1/2 pl-2">
                        <View className="flex-row items-center mb-2">
                            <Skeleton width={14} height={14} radius={7} className="mr-2" />
                            <Skeleton width="34%" height={10} radius={4} />
                        </View>
                        <Skeleton width="42%" height={14} radius={5} />
                    </View>
                </View>
            </Card>
        </MotiView>
    );

    const handleAddToken = async () => {
        if (!token.trim()) {
            Alert.alert('Error', 'Please enter a valid GitHub token');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(
                `${BASE_URL}/user/token/github-token`,
                { token: token.trim() },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            Alert.alert('Success', 'GitHub token added successfully!');
            setToken('');
            fetchTokenStatus();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to add token');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveToken = async () => {
        Alert.alert(
            'Remove Token',
            'Are you sure? This will:\n• Switch to 60min check frequency\n• Disable private repo access',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`${BASE_URL}/user/token/github-token`, {
                                headers: { Authorization: `Bearer ${userToken}` }
                            });
                            fetchTokenStatus();
                            Alert.alert('Success', 'Token removed successfully');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to remove token');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 py-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border shadow-sm"
                    style={shadowStyles.light}
                >
                    <ArrowLeft size={22} color="#0F172A" />
                </TouchableOpacity>
                <View className="ml-4">
                    <Text className="text-2xl font-poppins-bold text-primary">GitHub Token</Text>
                    <Text className="text-muted text-xs font-inter-semibold uppercase tracking-wider">
                        Developer Settings
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                {/* Status Card */}
                {loading ? (
                    <StatusCardSkeleton />
                ) : status && (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                    >
                        <Card className={`p-6 mb-6 border-2 ${status.hasToken ? 'border-success bg-success/5' : 'border-brand/20'}`}>
                            <View className="flex-row items-center mb-4">
                                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${status.hasToken ? 'bg-success/20' : 'bg-brand/10'}`}>
                                    {status.hasToken ? (
                                        <CheckCircle size={24} color="#10B981" />
                                    ) : (
                                        <Key size={24} color="#6366F1" />
                                    )}
                                </View>
                                <View>
                                    <Text className="text-lg font-poppins-bold text-primary">
                                        {status.hasToken ? 'Token Active' : 'No Token Added'}
                                    </Text>
                                    <Text className="text-xs text-muted font-inter-medium">
                                        {status.hasToken ? 'Enhanced features enabled' : 'Using default rate limits'}
                                    </Text>
                                </View>
                            </View>

                            {/* Benefits Grid */}
                            <View className="flex-row flex-wrap">
                                <View className="w-1/2 pr-2 mb-3">
                                    <View className="flex-row items-center">
                                        <Clock size={14} color={status.hasToken ? "#10B981" : "#94A3B8"} style={{ marginRight: 4 }} />
                                        <Text className="text-xs font-inter-bold text-muted">Check Frequency</Text>
                                    </View>
                                    <Text className={`text-sm font-poppins-semibold ${status.hasToken ? 'text-success' : 'text-primary'}`}>
                                        {status.checkFrequency}
                                    </Text>
                                </View>

                                <View className="w-1/2 pl-2 mb-3">
                                    <View className="flex-row items-center">
                                        <Lock size={14} color={status.hasToken ? "#10B981" : "#94A3B8"} style={{ marginRight: 4 }} />
                                        <Text className="text-xs font-inter-bold text-muted">Private Repos</Text>
                                    </View>
                                    <Text className={`text-sm font-poppins-semibold ${status.hasToken ? 'text-success' : 'text-muted'}`}>
                                        {status.privateRepos ? 'Enabled' : 'Disabled'}
                                    </Text>
                                </View>

                                <View className="w-1/2 pr-2">
                                    <View className="flex-row items-center">
                                        <Zap size={14} color={status.hasToken ? "#10B981" : "#94A3B8"} style={{ marginRight: 4 }} />
                                        <Text className="text-xs font-inter-bold text-muted">Rate Limit</Text>
                                    </View>
                                    <Text className={`text-sm font-poppins-semibold ${status.hasToken ? 'text-success' : 'text-primary'}`}>
                                        {status.hasToken ? '5000/hour' : 'Shared'}
                                    </Text>
                                </View>

                                {status.hasToken && status.rateLimit && (
                                    <View className="w-1/2 pl-2">
                                        <View className="flex-row items-center">
                                            <Eye size={14} color="#10B981" style={{ marginRight: 4 }} />
                                            <Text className="text-xs font-inter-bold text-muted">Remaining</Text>
                                        </View>
                                        <Text className="text-sm font-poppins-semibold text-success">
                                            {status.rateLimit.remaining}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {status.hasToken && !status.isValid && (
                                <View className="mt-4 p-3 bg-danger/10 rounded-xl flex-row items-center">
                                    <AlertTriangle size={16} color="#EF4444" className="mr-2" />
                                    <Text className="flex-1 text-xs text-danger font-inter-semibold">
                                        Token is invalid or expired. Please update.
                                    </Text>
                                </View>
                            )}
                        </Card>
                    </MotiView>
                )}

                {/* Info Card */}
                <Card className="p-6 mb-6 bg-brand/5 border border-brand/20">
                    <Text className="text-base font-poppins-bold text-primary mb-3">
                        Why add a personal token?
                    </Text>
                    <Text className="text-sm text-muted font-inter-medium leading-6 mb-4">
                        • Track private repositories you have access to{'\n'}
                        • Get notifications faster (30min vs 60min){'\n'}
                        • Dedicated 5,000 requests/hour rate limit{'\n'}
                        • Better reliability and performance
                    </Text>
                    <TouchableOpacity
                        onPress={() => Linking.openURL('https://github.com/settings/tokens/new?scopes=repo,read:user')}
                        className="flex-row items-center"
                    >
                        <Text className="text-brand font-inter-semibold text-sm">Create Token on GitHub</Text>
                        <ExternalLink size={14} color="#6366F1" className="ml-1" />
                    </TouchableOpacity>
                </Card>

                {/* Add/Update Token Form */}
                {(!status?.hasToken || !status?.isValid) && (
                    <Card className="p-6 mb-6">
                        <Text className="text-lg font-poppins-bold text-primary mb-4">
                            Add GitHub Token
                        </Text>

                        <View className="mb-4">
                            <Text className="text-xs text-muted font-inter-bold mb-2 uppercase tracking-wider">
                                Personal Access Token
                            </Text>
                            <View className="bg-slate-50 rounded-xl border border-border px-4 py-3 flex-row items-center">
                                <TextInput
                                    className="flex-1 text-primary font-mono text-sm"
                                    value={token}
                                    onChangeText={setToken}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showToken}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity onPress={() => setShowToken(!showToken)} className="ml-2">
                                    <Eye size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Button
                            title="Add Token"
                            onPress={handleAddToken}
                            loading={loading}
                            icon={Key}
                        />
                    </Card>
                )}

                {/* Remove Token Button */}
                {status?.hasToken && (
                    <Button
                        title="Remove Token"
                        variant="danger"
                        onPress={handleRemoveToken}
                    />
                )}

                {/* Security Notice */}
                <View className="mt-6 p-4 bg-slate-50 rounded-xl">
                    <View className="flex-row items-center mb-2">
                        <Lock size={14} color="#64748B" className="mr-2" />
                        <Text className="text-xs text-muted font-inter-bold uppercase tracking-wider">
                            Security Notice
                        </Text>
                    </View>
                    <Text className="text-xs text-muted font-inter-medium leading-5">
                        Your token is encrypted and stored securely. We only use it to check repositories you've subscribed to. You can remove it anytime.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default GitHubTokenSettings;
