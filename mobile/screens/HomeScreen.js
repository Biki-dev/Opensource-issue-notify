import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card } from '../components/UI';
import { Clock, Tag, Info, GitFork, PlusCircle, Bell, Edit2 } from 'lucide-react-native';
import { MotiView } from 'moti';

const HomeScreen = ({ navigation }) => {
    const { userToken, BASE_URL, unreadCount, updateUnreadCount } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

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
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchSubs();
        });
        return unsubscribe;
    }, [navigation]);

    const renderItem = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 100 * (index % 10) }}
        >
            <Card className="mb-4">
                <View className="flex-row items-start justify-between">
                    <View className="flex-row flex-1">
                        <View className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/10 items-center justify-center mr-4">
                            <GitFork size={24} color="#D97706" />
                        </View>
                        <View className="flex-1">
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-base font-poppins-bold text-primary mr-2 flex-1" numberOfLines={1}>
                                    {item.repository.owner}/{item.repository.name}
                                </Text>
                                <View className="flex-row items-center">
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('EditLabels', { sub: item })}
                                        className="w-8 h-8 rounded-lg bg-muted/5 items-center justify-center mr-2 border border-muted/10"
                                    >
                                        <Edit2 size={14} color="#556077" />
                                    </TouchableOpacity>
                                    <View className="bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                                        <Text className="text-brand text-[8px] font-poppins-bold uppercase">Active</Text>
                                    </View>
                                </View>
                            </View>
                            <View className="flex-row items-center mb-3">
                                <Clock size={14} color="#8A93A5" className="mr-1.5" />
                                <Text className="text-muted text-[10px] font-inter-medium">
                                    Checked {new Date(item.repository.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                </Text>
                            </View>

                            <View className="flex-row flex-wrap">
                                {item.labels.map((label, index) => (
                                    <View key={index} className="bg-brand/5 px-3 py-1.5 rounded-full mr-2 mb-2 border border-brand/10 flex-row items-center">
                                        <Tag size={12} color="#D97706" className="mr-1.5" />
                                        <Text className="text-xs font-inter-semibold text-brand">#{label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </Card>
        </MotiView>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 pt-6 pb-4 flex-row justify-between items-center">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                >
                    <Text className="text-3xl font-poppins-bold text-primary">Subscriptions</Text>
                    <Text className="text-muted text-sm mt-1 font-inter-medium">Manage your repository subscriptions</Text>
                </MotiView>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    className="w-12 h-12 rounded-2xl bg-card border border-border items-center justify-center"
                >
                    <Bell size={22} color="#D97706" />
                    {unreadCount > 0 && (
                        <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-danger rounded-full border-2 border-card" />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={subs}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSubs} tintColor="#D97706" />}
                ListFooterComponent={
                    <View className="mt-4">
                        <Button
                            title={
                                <View className="flex-row items-center">
                                    <PlusCircle size={22} color="#fff" className="mr-3" />
                                    <Text className="text-white font-inter-semibold text-lg">Add Repository</Text>
                                </View>
                            }
                            onPress={() => navigation.navigate('AddRepo')}
                            className="h-16 rounded-[24px] mb-6"
                        />

                        <Card className="flex-row items-center py-5">
                            <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-4">
                                <Info size={20} color="#D97706" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-poppins-bold text-primary mb-0.5">Stay Updated</Text>
                                <Text className="text-xs text-muted font-inter-medium leading-4">Add repositories to track specific labels and get notified when new issues are created.</Text>
                            </View>
                        </Card>
                    </View>
                }
                ListEmptyComponent={!loading && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.9, translateY: 30 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 0, stiffness: 150 }}
                        className="items-center py-2"
                    >
                        <Image
                            source={require('../maskot/subadd.png')}
                            style={{ width: 320, height: 320, resizeMode: 'contain', marginBottom: 10 }}
                        />
                        <Text className="text-primary text-3xl font-poppins-bold text-center mb-2">No subscriptions yet</Text>
                        <Text className="text-muted font-inter-medium text-center px-12 leading-6">
                            Add a GitHub repository to start tracking issues that matter.
                        </Text>
                    </MotiView>
                )}
            />
        </SafeAreaView>
    );
};

export default HomeScreen;
