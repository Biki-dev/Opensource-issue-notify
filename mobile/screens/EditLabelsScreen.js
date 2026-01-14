import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card, LabelChip } from '../components/UI';
import { ArrowLeft, GitFork, Tag } from 'lucide-react-native';
import { MotiView } from 'moti';

const EditLabelsScreen = ({ route, navigation }) => {
    const { userToken, BASE_URL, updateUnreadCount } = useContext(AuthContext);
    const { sub } = route.params;

    const [loading, setLoading] = useState(false);
    const [repoData, setRepoData] = useState(null);
    const [selectedLabels, setSelectedLabels] = useState(sub.labels || []);

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
            updateUnreadCount();
            navigation.goBack();
        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'Failed to update labels.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 py-4 flex-row items-center bg-background border-b border-border">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 mr-4 items-center justify-center rounded-xl bg-card border border-border shadow-sm shadow-black/5"
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-primary">Edit Labels</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="mb-6 border border-border">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-2xl bg-brand/10 items-center justify-center mr-4">
                                <GitFork size={24} color="#D97706" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-primary">
                                    {sub.repository.owner}/{sub.repository.name}
                                </Text>
                                <Text className="text-muted text-xs font-medium">Manage tracked labels</Text>
                            </View>
                        </View>
                    </Card>
                </MotiView>

                {repoData && (
                    <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 200 }}>
                        <Text className="text-xl font-black text-primary mb-4">Select Labels to Track</Text>
                        <View className="flex-row flex-wrap mb-10">
                            {repoData.labels.map((label, index) => (
                                <LabelChip
                                    key={index}
                                    label={label.name}
                                    selected={selectedLabels.includes(label.name)}
                                    onPress={() => toggleLabel(label.name)}
                                />
                            ))}
                        </View>
                    </MotiView>
                )}

                {loading && !repoData && (
                    <View className="items-center py-20">
                        <Text className="text-muted">Loading available labels...</Text>
                    </View>
                )}
            </ScrollView>

            <View className="absolute bottom-10 left-6 right-6">
                <Button
                    title={`Update Subscriptions (${selectedLabels.length})`}
                    onPress={handleSave}
                    loading={loading}
                    className="h-16 rounded-[24px]"
                />
            </View>
        </SafeAreaView>
    );
};

export default EditLabelsScreen;
