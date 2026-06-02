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

    const renderCompactCard = ({ item, index }) => {
        const statusColor = item.visible === false ? '#94A3B8' : item.muted ? '#F59E0B' : '#10B981';
        const statusLabel = item.visible === false ? 'Hidden' : item.muted ? 'Muted' : 'Active';

        return (
            <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 260, delay: index * 35 }}
                style={{ width: '48%', marginRight: index % 2 === 0 ? '4%' : 0 }}
            >
                <TouchableOpacity
                    onPress={() => navigation.navigate('RepoDetail', { subscriptionId: item._id })}
                    activeOpacity={0.85}
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        padding: 14,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: '#F1F5F9',
                        opacity: item.visible === false ? 0.6 : 1,
                        ...shadowStyles.light
                    }}
                >
                    {/* Avatar */}
                    <View style={{ alignItems: 'center', marginBottom: 10 }}>
                        <View style={{
                            width: 44, height: 44,
                            borderRadius: 14,
                            backgroundColor: '#EEF2FF',
                            overflow: 'hidden',
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: '#E0E7FF'
                        }}>
                            {item.repository?.ownerAvatarUrl ? (
                                <Image source={{ uri: item.repository.ownerAvatarUrl }}
                                    style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <GitFork size={20} color="#6366F1" />
                                </View>
                            )}
                        </View>
                        <Text style={{
                            fontSize: 9, color: '#94A3B8',
                            fontFamily: 'JetBrainsMono_400Regular',
                            marginBottom: 2
                        }} numberOfLines={1}>
                            {item.repository.owner}
                        </Text>
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Poppins_600SemiBold',
                            color: '#0F172A',
                            textAlign: 'center'
                        }} numberOfLines={2}>
                            {item.repository.name}
                        </Text>
                    </View>

                    {/* Labels */}
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        minHeight: 44,
                        marginBottom: 10
                    }}>
                        {item.labels.slice(0, 3).map((label, idx) => (
                            <View key={idx} style={{
                                backgroundColor: '#EEF2FF',
                                borderRadius: 20,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                margin: 2
                            }}>
                                <Text style={{
                                    fontSize: 8,
                                    color: '#6366F1',
                                    fontFamily: 'Inter_600SemiBold'
                                }} numberOfLines={1}>
                                    {label}
                                </Text>
                            </View>
                        ))}
                        {item.labels.length > 3 && (
                            <View style={{
                                backgroundColor: '#F1F5F9',
                                borderRadius: 20,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                margin: 2
                            }}>
                                <Text style={{ fontSize: 8, color: '#94A3B8', fontFamily: 'Inter_600SemiBold' }}>
                                    +{item.labels.length - 3}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Status + divider */}
                    <View style={{
                        borderTopWidth: 1,
                        borderTopColor: '#F8FAFC',
                        paddingTop: 10
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <View style={{
                                width: 6, height: 6,
                                borderRadius: 3,
                                backgroundColor: statusColor,
                                marginRight: 5
                            }} />
                            <Text style={{
                                fontSize: 9,
                                color: statusColor,
                                fontFamily: 'Inter_600SemiBold',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                                {statusLabel}
                            </Text>
                        </View>

                        {/* Action buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TouchableOpacity
                                onPress={() => toggleVisibility(item._id, item.visible)}
                                style={{
                                    flex: 1,
                                    height: 28,
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 3,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0'
                                }}
                            >
                                {item.visible === false
                                    ? <Eye size={12} color="#6366F1" />
                                    : <EyeOff size={12} color="#94A3B8" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => toggleMute(item._id, item.muted)}
                                style={{
                                    flex: 1,
                                    height: 28,
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginHorizontal: 3,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0'
                                }}
                            >
                                {item.muted
                                    ? <BellOff size={12} color="#F59E0B" />
                                    : <Bell size={12} color="#94A3B8" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => navigation.navigate('EditLabels', { sub: item })}
                                style={{
                                    flex: 1,
                                    height: 28,
                                    backgroundColor: '#EEF2FF',
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginLeft: 3,
                                    borderWidth: 1,
                                    borderColor: '#C7D2FE'
                                }}
                            >
                                <Edit2 size={12} color="#6366F1" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </MotiView>
        );
    };



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
                        from={{ opacity: 0, translateY: 30 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 120 }}
                        style={{ alignItems: 'center', paddingHorizontal: 24 }}
                    >
                        <AnimatedMascot
                            source={require('../maskot/subadd.png')}
                            style={{ width: 240, height: 240 }}
                        />
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 200, type: 'timing', duration: 300 }}
                        >
                            <Text style={{
                                fontSize: 22,
                                fontFamily: 'Poppins_700Bold',
                                color: '#0F172A',
                                textAlign: 'center',
                                marginBottom: 8
                            }}>
                                {searchQuery ? "No matches found" : "Ready to track?"}
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'Inter_400Regular',
                                color: '#64748B',
                                textAlign: 'center',
                                lineHeight: 22,
                                marginBottom: 24
                            }}>
                                {searchQuery
                                    ? `No repositories match "${searchQuery}"`
                                    : "Add a GitHub repo to start tracking issues that matter to you."}
                            </Text>
                        </MotiView>
                        {!searchQuery && (
                            <MotiView
                                from={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 350, type: 'spring', damping: 15 }}
                            >
                                <Button
                                    title="Add Your First Repo"
                                    onPress={() => navigation.navigate('AddRepo')}
                                    className="px-10"
                                />
                            </MotiView>
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