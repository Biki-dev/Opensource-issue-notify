import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button, LabelChip } from '../components/UI';
import { Bell, ArrowRight } from 'lucide-react-native';

const DashboardScreen = ({ navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subsRes, notifRes] = await Promise.all([
                    axios.get(`${BASE_URL}/repos`, { headers: { Authorization: `Bearer ${userToken}` } }),
                    axios.get(`${BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${userToken}` } }),
                ]);
                setSubs(subsRes.data || []);
                setNotifications((notifRes.data || []).slice(0, 5));
            } catch (e) {
                console.log(e);
            }
        };
        const unsubscribe = navigation.addListener('focus', fetchData);
        return unsubscribe;
    }, [navigation]);

    const totalLabels = subs.reduce((sum, s) => sum + (s.labels?.length || 0), 0);

    const renderIssue = ({ item }) => (
        <Card className="mb-3">
            <Text className="text-xs font-semibold text-gray-500 mb-1">
                {item.repository?.owner}/{item.repository?.name}
            </Text>
            <Text className="text-base font-bold text-gray-900 mb-2">{item.issueTitle}</Text>
            <View className="flex-row flex-wrap mb-3">
                {item.matchedLabels.map((l, i) => (
                    <LabelChip key={i} label={l} selected={false} onPress={() => {}} />
                ))}
            </View>
            <Button
                title="Open"
                onPress={() => navigation.navigate('Notifications')}
                className="h-11 rounded-2xl"
            />
        </Card>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-6 pt-2 pb-4 flex-row justify-between items-center bg-white border-b border-gray-100">
                <Text className="text-2xl font-bold text-gray-900">IssueLabelNotifier</Text>
                <Button
                    variant="outline"
                    title={<Bell size={20} color="#000" />}
                    className="w-12 h-12 !rounded-full p-0"
                    onPress={() => navigation.navigate('Notifications')}
                />
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item._id}
                renderItem={renderIssue}
                contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
                ListHeaderComponent={
                    <View>
                        <Card className="bg-black mb-4">
                            <Text className="text-yellow-400 text-xs font-semibold mb-1">IMPACT SCORE</Text>
                            <Text className="text-5xl font-extrabold text-yellow-400 mb-3">6</Text>
                            <Text className="text-gray-400 text-xs">{subs.length} active subscriptions • {totalLabels} labels</Text>
                        </Card>
                        <Card className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-sm text-gray-500 mb-1">Active Subscriptions</Text>
                                <Text className="text-2xl font-bold text-gray-900">{subs.length}</Text>
                            </View>
                            <Button
                                variant="outline"
                                title={<ArrowRight size={18} color="#000" />}
                                className="w-10 h-10 !rounded-full"
                                onPress={() => navigation.navigate('SubscriptionsTab')}
                            />
                        </Card>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-lg font-bold text-gray-900">Recent Issues</Text>
                            <Text className="text-xs text-gray-400">{notifications.length} total</Text>
                        </View>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default DashboardScreen;
