import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Alert, ScrollView, Image, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card, LabelChip, shadowStyles } from '../components/UI';
import { ArrowLeft, GitFork, Tag, Github, Search, Filter, Bell, BellOff } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { StatusBar } from 'expo-status-bar';

const EditLabelsScreen = ({ route, navigation }) => {
    const { userToken, BASE_URL, updateUnreadCount } = useContext(AuthContext);
    const { sub } = route.params;

    const [loading, setLoading] = useState(false);
    const [repoData, setRepoData] = useState(null);
    const [selectedLabels, setSelectedLabels] = useState(sub.labels || []);
    const [muted, setMuted] = useState(!!sub.muted);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLabels = async () => {
            if (!sub?.repository?.githubUrl) return;
            setLoading(true);
            try {
                const res = await axios.post(
                    `${BASE_URL}/repos/preview`,
                    { url: sub.repository.githubUrl },
                    { headers: { Authorization: `Bearer ${userToken}` } }
                );
                setRepoData(res.data);
            } catch (e) {
                console.log(e);
                Alert.alert('Error', 'Could not load labels for this repository.');
            } finally {
                setLoading(false);
            }
        };

        fetchLabels();
    }, []);

    const toggleLabel = (labelName) => {
        if (selectedLabels.includes(labelName)) {
            setSelectedLabels(selectedLabels.filter(l => l !== labelName));
        } else {
            setSelectedLabels([...selectedLabels, labelName]);
        }
    };

    const toggleMute = async () => {
        setLoading(true);
        try {
            const res = await axios.patch(
                `${BASE_URL}/repos/${sub._id}`,
                { muted: !muted },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setMuted(!!res.data.muted);
            navigation.setParams({ sub: res.data });
        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'Failed to update notification mute state.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (selectedLabels.length === 0) {
            Alert.alert('No Labels', 'Please select at least one label to track.');
            return;
        }
        setLoading(true);
        try {
            await axios.patch(
                `${BASE_URL}/repos/${sub._id}`,
                { labels: selectedLabels },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            await updateUnreadCount();
            navigation.goBack();
        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'Failed to update labels.');
        } finally {
            setLoading(false);
        }
    };

    const filteredLabels = repoData?.labels?.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border shadow-sm"
                        style={shadowStyles.light}
                    >
                        <ArrowLeft size={22} color="#0F172A" />
                    </TouchableOpacity>
                    <View className="ml-4">
                        <Text className="text-2xl font-poppins-bold text-primary">Edit Labels</Text>
                        <Text className="text-muted text-xs font-inter-semibold uppercase tracking-wider">Management</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}>
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                >
                    <Card className="p-6 mb-8 border border-brand/20 bg-slate-50">
                        <View className="flex-row items-center mb-4">
                            <View className="w-14 h-14 rounded-2xl bg-brand/10 items-center justify-center mr-4 overflow-hidden">
                                {sub.repository?.ownerAvatarUrl ? (
                                    <Image
                                        source={{ uri: sub.repository.ownerAvatarUrl }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <GitFork size={28} color="#6366F1" />
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-xl font-poppins-bold text-primary">{sub.repository?.owner}/{sub.repository?.name}</Text>
                                <View className="flex-row items-center mt-1">
                                    <Tag size={12} color="#6366F1" className="mr-1" />
                                    <Text className="text-muted text-[10px] font-inter-bold uppercase">Active Subscription</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={toggleMute}
                                className={`w-11 h-11 rounded-2xl items-center justify-center ${muted ? 'bg-amber-100 border border-amber-200' : 'bg-slate-100 border border-border'}`}
                            >
                                {muted ? (
                                    <BellOff size={18} color="#F59E0B" fill="none" />
                                ) : (
                                    <Bell size={18} color="#94A3B8" fill="none" />
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text className={`text-xs font-inter-semibold uppercase tracking-wider ${muted ? 'text-amber-600' : 'text-success'}`}>
                            {muted ? 'Notifications muted' : 'Notifications enabled'}
                        </Text>
                    </Card>
                </MotiView>

                {repoData ? (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 200 }}
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-xl font-poppins-bold text-primary">Available Labels</Text>
                            <View className="bg-brand/10 px-3 py-1 rounded-full border border-brand/10">
                                <Text className="text-brand text-xs font-poppins-bold">{selectedLabels.length} Active</Text>
                            </View>
                        </View>

                        {/* Search Bar */}
                        <View className="bg-slate-50 h-12 rounded-xl border border-border px-4 flex-row items-center mb-6 shadow-sm">
                            <Search size={18} color="#94A3B8" className="mr-2" />
                            <TextInput
                                className="flex-1 text-primary font-inter-medium"
                                placeholder="Filter labels..."
                                placeholderTextColor="#94A3B8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <View className="flex-row flex-wrap">
                            {filteredLabels.map((label, index) => (
                                <MotiView
                                    key={label.name}
                                    from={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 20 }}
                                >
                                    <LabelChip
                                        label={label.name}
                                        selected={selectedLabels.includes(label.name)}
                                        onPress={() => toggleLabel(label.name)}
                                    />
                                </MotiView>
                            ))}
                        </View>

                        {filteredLabels.length === 0 && (
                            <View className="items-center py-10">
                                <Filter size={32} color="#334155" className="mb-2" />
                                <Text className="text-muted font-inter-medium">No labels matching your filter</Text>
                            </View>
                        )}
                    </MotiView>
                ) : (
                    <View className="items-center py-20">
                        <MotiView
                            from={{ rotate: '0deg' }}
                            animate={{ rotate: '360deg' }}
                            transition={{ loop: true, duration: 2000, type: 'timing' }}
                        >
                            <Github size={48} color="#334155" />
                        </MotiView>
                        <Text className="text-muted font-inter-semibold mt-4">Fetching available updates...</Text>
                    </View>
                )}
            </ScrollView>

            <View className="absolute bottom-10 left-6 right-6" style={shadowStyles.strong}>
                <Button
                    title={`Save Changes (${selectedLabels.length})`}
                    onPress={handleSave}
                    loading={loading}
                    className="h-16"
                />
            </View>
        </SafeAreaView>
    );
};

export default EditLabelsScreen;
