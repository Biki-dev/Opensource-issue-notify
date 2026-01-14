import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Card, LabelChip } from '../components/UI';
import { ArrowLeft } from 'lucide-react-native';

const EditLabelsScreen = ({ route, navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const { sub } = route.params; // subscription object passed from HomeScreen

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
            // When we go back, Dashboard/Home will refetch and show updated issues/notifications
            navigation.goBack();
        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'Failed to update labels.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-6 py-4 flex-row items-center bg-white shadow-sm z-10">
                <Button
                    variant="outline"
                    title={<ArrowLeft size={20} color="#000" />}
                    className="w-10 h-10 mr-4 border-gray-200 !rounded-xl"
                    onPress={() => navigation.goBack()}
                />
                <Text className="text-xl font-bold text-gray-900">Edit Labels</Text>
            </View>

            <ScrollView className="p-6">
                {sub?.repository && (
                    <Card className="mb-6 border-l-4 border-l-primary">
                        <Text className="text-xl font-bold text-gray-900 mb-1">
                            {sub.repository.owner}/{sub.repository.name}
                        </Text>
                    </Card>
                )}

                {repoData && (
                    <View>
                        <Text className="text-lg font-bold text-gray-900 mb-4">Select Labels to Track</Text>
                        <View className="flex-row flex-wrap">
                            {repoData.labels.map(label => (
                                <LabelChip
                                    key={label.name}
                                    label={label.name}
                                    selected={selectedLabels.includes(label.name)}
                                    onPress={() => toggleLabel(label.name)}
                                />
                            ))}
                        </View>
                        <View className="h-24" />
                    </View>
                )}
            </ScrollView>

            <View className="absolute bottom-6 left-6 right-6">
                <Button
                    title={`Save Labels (${selectedLabels.length})`}
                    onPress={handleSave}
                    loading={loading}
                />
            </View>
        </SafeAreaView>
    );
};

export default EditLabelsScreen;
