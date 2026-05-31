import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card, AnimatedMascot, FAB, shadowStyles, LabelChip, SectionHeader, ListSkeleton, cn } from '../components/UI';
import { Clock, Tag, Search, Plus, Bell, BellOff, Edit2, GitFork, Star, Code2, Trash2, Filter, Eye, EyeOff } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { StatusBar } from 'expo-status-bar';

const HomeScreen = ({ navigation }) => {
    const { userToken, BASE_URL, unreadCount, updateUnreadCount } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const fetchSubs = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/repos`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setSubs(res.data);
            updateUnreadCount();
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchSubs);
        return unsubscribe;
    }, [navigation]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSubs();
    }, []);

    const filteredSubs = subs.filter(sub =>
        sub.repository.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.repository.owner.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDeleteSub = async (id) => {
        try {
            await axios.delete(`${BASE_URL}/repos/${id}`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setSubs(prev => prev.filter(s => s._id !== id));
        } catch (e) {
            console.log(e);
        }
    };

    const toggleVisibility = async (id, currentVisible) => {
        try {
            const res = await axios.patch(
                `${BASE_URL}/repos/${id}`,
                { visible: !currentVisible },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setSubs(prev => prev.map(s => s._id === id ? res.data : s));
        } catch (e) {
            console.log(e);
        }
    };

    const toggleMute = async (id, currentMuted) => {
        try {
            const res = await axios.patch(
                `${BASE_URL}/repos/${id}`,
                { muted: !currentMuted },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setSubs(prev => prev.map(s => s._id === id ? res.data : s));
        } catch (e) {
            console.log(e);
        }
    };

    const renderCompactCard = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 15, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 300, delay: index * 40 }}
            style={{ width: '48%', marginRight: index % 2 === 0 ? '4%' : 0 }}
        >
            <Card className="mb-4 p-3" containerStyle={{ opacity: item.visible === false ? 0.6 : item.muted ? 0.82 : 1 }}>
                <View className="items-center mb-2">
                    <View className="w-10 h-10 rounded-xl bg-[#EEF2FF] items-center justify-center mb-2 overflow-hidden">
                        {item.repository?.ownerAvatarUrl ? (
                            <Image
                                source={{ uri: item.repository.ownerAvatarUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <GitFork size={18} color="#6366F1" fill="none" />
                        )}
                    </View>
                    <Text className="text-[9px] text-muted font-mono mb-0.5" numberOfLines={1}>
                        {item.repository.owner}
                    </Text>
                    <Text className="text-xs font-poppins-bold text-primary text-center leading-4" numberOfLines={2}>
                        {item.repository.name}
                    </Text>
                </View>

                <View className="flex-row flex-wrap justify-center mb-2 h-14 overflow-hidden">
                    {item.labels.slice(0, 3).map((label, idx) => (
                        <View key={idx} className="bg-[#EEF2FF] rounded-full px-2 py-0.5 m-0.5">
                            <Text className="text-brand text-[8px] font-inter-bold" numberOfLines={1}>{label}</Text>
                        </View>
                    ))}
                    {item.labels.length > 3 && (
                        <View className="bg-slate-100 rounded-full px-2 py-0.5 m-0.5">
                            <Text className="text-muted text-[8px] font-inter-bold">+{item.labels.length - 3}</Text>
                        </View>
                    )}
                </View>

                <View className="flex-row items-center justify-center mb-2 pb-2 border-b border-border/50">
                    <View className={cn("w-1.5 h-1.5 rounded-full mr-1.5", item.visible === false ? "bg-muted" : item.muted ? "bg-amber-500" : "bg-success")} />
                    <Text className="text-muted text-[8px] font-inter-bold uppercase tracking-tighter">
                        {item.visible === false ? "Hidden" : item.muted ? "Muted" : "Monitoring"}
                    </Text>
                </View>

                <View className="flex-row justify-between">
                    <TouchableOpacity
                        onPress={() => toggleVisibility(item._id, item.visible)}
                        className="w-8 h-8 rounded-lg bg-slate-50 border border-border items-center justify-center"
                    >
                        {item.visible === false ? <Eye size={12} color="#6366F1" fill="none" /> : <EyeOff size={12} color="#94A3B8" fill="none" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => toggleMute(item._id, item.muted)}
                        className="w-8 h-8 rounded-lg bg-slate-50 border border-border items-center justify-center"
                    >
                        {item.muted ? <BellOff size={12} color="#F59E0B" fill="none" /> : <Bell size={12} color="#94A3B8" fill="none" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('EditLabels', { sub: item })}
                        className="w-8 h-8 rounded-lg bg-slate-50 border border-border items-center justify-center"
                    >
                        <Edit2 size={12} color="#6366F1" fill="none" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                if (window.confirm('Stop tracking?')) handleDeleteSub(item._id);
                            } else {
                                Alert.alert('Delete', 'Stop tracking?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Yes', style: 'destructive', onPress: () => handleDeleteSub(item._id) }
                                ]);
                            }
                        }}
                        className="w-8 h-8 rounded-lg bg-danger/10 items-center justify-center"
                    >
                        <Trash2 size={12} color="#EF4444" fill="none" />
                    </TouchableOpacity>
                </View>
            </Card>
        </MotiView>
    );



    // Decide which render function to use
    const isSingleRepo = filteredSubs.length === 1;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 pt-4 pb-2">
                <View className="flex-row justify-between items-center mb-4">
                    <MotiView
                        from={{ opacity: 0, translateX: -20 }}
                        animate={{ opacity: 1, translateX: 0 }}
                    >
                        <Text className="text-2xl font-poppins-bold text-primary">Subscriptions</Text>
                    </MotiView>
                    <View className="flex-row">
                        <TouchableOpacity
                            onPress={() => setShowSearch(!showSearch)}
                            className="w-12 h-12 rounded-2xl bg-white border border-border items-center justify-center mr-2 shadow-sm"
                            style={shadowStyles.light}
                        >
                            <Search size={22} color="#0F172A" fill="none" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            className="w-12 h-12 rounded-2xl bg-white border border-border items-center justify-center shadow-sm"
                            style={shadowStyles.light}
                        >
                            <Bell size={22} color="#0F172A" fill="none" />
                            {unreadCount > 0 && <View className="absolute top-2.5 right-2.5 w-3 h-3 bg-danger rounded-full border-2 border-white" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <AnimatePresence>
                    {showSearch && (
                        <MotiView
                            from={{ opacity: 0, height: 0, scaleY: 0.5 }}
                            animate={{ opacity: 1, height: 76, scaleY: 1 }}
                            exit={{ opacity: 0, height: 0, scaleY: 0.5 }}
                            className="overflow-hidden"
                        >
                            <View className="bg-white h-14 rounded-2xl border border-border px-4 flex-row items-center mt-2 mb-4 shadow-sm" style={shadowStyles.light}>
                                <Search size={20} color="#94A3B8" className="mr-3" />
                                <TextInput
                                    className="flex-1 text-base text-primary font-inter-medium h-full"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Search repositories..."
                                    placeholderTextColor="#94A3B8"
                                    autoFocus
                                />
                                {searchQuery !== '' && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Text className="text-brand font-inter-semibold">Clear</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </MotiView>
                    )}
                </AnimatePresence>
            </View>

            {loading && (
                <View className="px-6">
                    <ListSkeleton count={4} type={isSingleRepo ? 'default' : 'compact'} />
                </View>
            )}

            <FlatList
                data={filteredSubs}
                renderItem={renderCompactCard}
                keyExtractor={item => item._id}
                numColumns={2}
                columnWrapperStyle={{ paddingHorizontal: 24 }}
                contentContainerStyle={{ paddingBottom: 110, paddingTop: 10 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                }
                ListEmptyComponent={!loading && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="items-center px-6"
                    >
                        <AnimatedMascot
                            source={require('../maskot/subadd.png')}
                            style={{ width: 280, height: 280 }}
                        />
                        <Text className="text-primary text-3xl font-poppins-bold text-center">
                            {searchQuery ? "No matches found" : "Ready to track?"}
                        </Text>
                        <Text className="text-muted text-base font-inter-medium text-center px-12 mb-4 mt-2 leading-6">
                            {searchQuery ? `We couldn't find any repositories matching "${searchQuery}"` : "Add a GitHub repository to start tracking issues that matter to you."}
                        </Text>
                        {!searchQuery && (
                            <Button
                                title="Add Your First Repo"
                                onPress={() => navigation.navigate('AddRepo')}
                                className="mt-8 px-10"
                            />
                        )}
                    </MotiView>
                )}
            />
            <View className="absolute bottom-24 right-6" style={shadowStyles.fab}>
                <FAB icon={Plus} onPress={() => navigation.navigate('AddRepo')} />
            </View>
        </SafeAreaView>
    );
};

export default HomeScreen;