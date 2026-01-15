import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card, AnimatedMascot, FAB, shadowStyles, LabelChip, SectionHeader } from '../components/UI';
import { Clock, Tag, Search, Plus, Bell, Edit2, GitFork, Star, Code2, Trash2, Filter } from 'lucide-react-native';
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

    const renderItem = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 30, scale: 0.95 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: index * 50 }}
        >
            <Card className="mb-6 p-6">
                <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-row flex-1">
                        <View className="w-14 h-14 rounded-2xl bg-brand/10 items-center justify-center mr-4 overflow-hidden">
                            {item.repository?.ownerAvatarUrl ? (
                                <Image
                                    source={{ uri: item.repository.ownerAvatarUrl }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <GitFork size={28} color="#6366F1" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-muted font-mono mb-0.5">{item.repository.owner}</Text>
                            <Text className="text-lg font-poppins-bold text-primary leading-6" numberOfLines={1}>
                                {item.repository.name}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <View className="flex-row items-center mr-3">
                                    <View className="w-2 h-2 rounded-full bg-success mr-1.5" />
                                    <Text className="text-muted text-[10px] font-inter-semibold uppercase">Monitoring</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Star size={12} color="#94A3B8" className="mr-1" />
                                    <Text className="text-muted text-[10px] font-inter-semibold">GitHub</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="flex-row flex-wrap mb-6">
                    {item.labels.map((label, idx) => (
                        <LabelChip key={idx} label={label} selected />
                    ))}
                </View>

                <View className="flex-row items-center justify-between pt-4 border-t border-border/50">
                    <View className="flex-row items-center">
                        <Clock size={14} color="#94A3B8" className="mr-2" />
                        <Text className="text-muted text-xs font-inter-medium">
                            {new Date(item.repository.lastChecked).toLocaleDateString()}
                        </Text>
                    </View>
                    <View className="flex-row">
                        <TouchableOpacity
                            onPress={() => navigation.navigate('EditLabels', { sub: item })}
                            className="w-10 h-10 rounded-xl bg-slate-50 border border-border items-center justify-center mr-2 shadow-sm"
                        >
                            <Edit2 size={18} color="#6366F1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    if (window.confirm('Stop tracking this repository and remove all matched issues?')) {
                                        handleDeleteSub(item._id);
                                    }
                                } else {
                                    Alert.alert(
                                        'Delete Subscription',
                                        'Stop tracking this repository and remove all matched issues?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteSub(item._id) }
                                        ]
                                    );
                                }
                            }}
                            className="w-10 h-10 rounded-xl bg-danger/10 items-center justify-center"
                        >
                            <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>
        </MotiView>
    );

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
                        <Text className="text-4xl font-poppins-bold text-primary">Subscriptions</Text>
                    </MotiView>
                    <View className="flex-row">
                        <TouchableOpacity
                            onPress={() => setShowSearch(!showSearch)}
                            className="w-12 h-12 rounded-2xl bg-white border border-border items-center justify-center mr-2 shadow-sm"
                            style={shadowStyles.light}
                        >
                            <Search size={22} color="#0F172A" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            className="w-12 h-12 rounded-2xl bg-white border border-border items-center justify-center shadow-sm"
                            style={shadowStyles.light}
                        >
                            <Bell size={22} color="#0F172A" />
                            {unreadCount > 0 && <View className="absolute top-2.5 right-2.5 w-3 h-3 bg-danger rounded-full border-2 border-white" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <AnimatePresence>
                    {showSearch && (
                        <MotiView
                            from={{ opacity: 0, height: 0, scaleY: 0.5 }}
                            animate={{ opacity: 1, height: 70, scaleY: 1 }}
                            exit={{ opacity: 0, height: 0, scaleY: 0.5 }}
                            className="overflow-hidden"
                        >
                            <View className="bg-white h-14 rounded-2xl border border-border px-4 flex-row items-center mb-4 shadow-sm" style={shadowStyles.light}>
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

            <FlatList
                data={filteredSubs}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110, paddingTop: 10 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                }
                ListEmptyComponent={!loading && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="items-center"
                    >
                        <AnimatedMascot
                            source={require('../maskot/subadd.png')}
                            style={{ width: 280, height: 280 }}
                        />
                        <Text className="text-primary text-3xl font-poppins-bold text-center mt-4">
                            {searchQuery ? "No matches found" : "Ready to track?"}
                        </Text>
                        <Text className="text-muted text-base font-inter-medium text-center px-12 mt-2 leading-6">
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

            <FAB icon={Plus} onPress={() => navigation.navigate('AddRepo')} />
        </SafeAreaView>
    );
};

export default HomeScreen;
