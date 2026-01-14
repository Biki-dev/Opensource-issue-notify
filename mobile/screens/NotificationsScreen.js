import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Card } from '../components/UI';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';

const NotificationsScreen = ({ navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [notifs, setNotifs] = useState([]);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/notifications`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                // Only show unread notifications in this screen; read ones still stay in DB
                setNotifs((res.data || []).filter(n => !n.isRead));
            } catch (e) {
                console.log(e);
            }
        };

        const unsubscribe = navigation.addListener('focus', fetchNotifs);
        return unsubscribe;
    }, [navigation, userToken]);

    const handleOpenNotification = async (item) => {
        try {
            // Open the GitHub issue
            Linking.openURL(item.issueUrl);

            // Mark notification as read so it disappears from this list,
            // but stays available for the dashboard recent issues.
            await axios.patch(`${BASE_URL}/notifications/${item._id}`, {
                isRead: true,
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            setNotifs((prev) => prev.filter((n) => n._id !== item._id));
        } catch (e) {
            console.log(e);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity onPress={() => handleOpenNotification(item)}>
            <Card className="border-l-4 border-l-red-500">
                <Text className="text-xs font-bold text-gray-400 mb-1 uppercase">{item.repository.owner}/{item.repository.name}</Text>
                <Text className="text-lg font-bold text-gray-900 mb-2">{item.issueTitle}</Text>

                <View className="flex-row flex-wrap">
                    {item.matchedLabels.map((l, i) => (
                        <View key={i} className="bg-red-50 px-2 py-1 rounded-md mr-1 border border-red-100">
                            <Text className="text-xs text-red-600 font-bold">{l}</Text>
                        </View>
                    ))}
                </View>

                <View className="flex-row items-center mt-3">
                    <Text className="text-primary font-bold text-sm mr-2">View Issue</Text>
                    <ExternalLink size={14} color="#FFD700" />
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-6 py-4 flex-row items-center bg-white shadow-sm z-10 mb-4">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Notifications</Text>
            </View>

            <FlatList
                data={notifs}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: 24 }}
                ListEmptyComponent={
                    <View className="items-center py-20">
                        <Text className="text-gray-400 text-lg">No notifications yet</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default NotificationsScreen;
