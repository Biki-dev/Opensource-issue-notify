import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card } from '../components/UI';
import { Bell, Plus, Github, Loader2 } from 'lucide-react-native';

const HomeScreen = ({ navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSubs = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/repos`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setSubs(res.data);
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

    const renderItem = ({ item }) => (
        <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                    <Github color="#000" size={24} className="mr-3" />
                    <View>
                        <Text className="text-lg font-bold text-gray-900">{item.repository.owner}/{item.repository.name}</Text>
                        <Text className="text-gray-500 text-xs mt-0.5">Checked {new Date(item.repository.lastChecked).toLocaleTimeString()}</Text>
                    </View>
                </View>
                <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-green-700 text-xs font-bold">Active</Text>
                </View>
            </View>
            <View className="flex-row flex-wrap mt-2">
                {item.labels.map((label, index) => (
                    <View key={index} className="bg-gray-100 px-3 py-1 rounded-md mr-2 mb-2">
                        <Text className="text-xs font-medium text-gray-600">#{label}</Text>
                    </View>
                ))}
            </View>
            <View className="mt-3 flex-row justify-end">
                <Button
                    variant="outline"
                    title="Edit Labels"
                    className="h-9 px-4 rounded-xl"
                    onPress={() => navigation.navigate('EditLabels', { sub: item })}
                />
            </View>
        </Card>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            <View className="px-6 pt-4 pb-6 flex-row justify-between items-center bg-slate-950 border-b border-slate-800">
                <View>
                    <Text className="text-[11px] font-semibold tracking-[3px] text-yellow-400 uppercase">Subscriptions</Text>
                    <Text className="text-2xl font-extrabold text-white mt-1">Tracked Repositories</Text>
                </View>
                <Button
                    variant="outline"
                    title={<Bell size={20} color="#000" />}
                    className="w-12 h-12 !rounded-full bg-white/95"
                    onPress={() => navigation.navigate('Notifications')}
                />
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <Loader2 size={32} className="text-primary animate-spin" />
                </View>
            ) : (
                <FlatList
                    data={subs}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSubs} />}
                    ListEmptyComponent={
                        <View className="items-center py-20">
                            <Text className="text-gray-300 text-lg text-center mb-2">No subscriptions yet</Text>
                            <Text className="text-gray-500 text-center px-10 mb-4">Add a GitHub repository to start tracking issues that matter.</Text>
                            <Button title="Add your first repo" onPress={() => navigation.navigate('AddRepo')} />
                        </View>
                    }
                />
            )}

            <View className="absolute bottom-8 right-6 left-6">
                <Button
                    title="Add Repository"
                    onPress={() => navigation.navigate('AddRepo')}
                    className="shadow-xl shadow-yellow-500/30"
                />
            </View>
        </SafeAreaView>
    );
};

export default HomeScreen;
