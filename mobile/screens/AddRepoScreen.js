import React, { useContext, useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Input, Card, LabelChip } from '../components/UI';
import { Search, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react-native';

const AddRepoScreen = ({ navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [step, setStep] = useState(1);
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [repoData, setRepoData] = useState(null);
    const [selectedLabels, setSelectedLabels] = useState([]);

    const handlePreview = async () => {
        if (!url.includes('github.com')) {
            Alert.alert('Invalid URL', 'Please enter a valid GitHub repository URL.');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/repos/preview`,
                { url },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setRepoData(res.data);
            setStep(2);
        } catch (e) {
            Alert.alert('Error', 'Could not find repository. Check the URL or privacy settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (selectedLabels.length === 0) {
            Alert.alert('No Labels', 'Please select at least one label to track.');
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/repos/subscribe`,
                { url, labels: selectedLabels },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to subscribe.');
        } finally {
            setLoading(false);
        }
    };

    const toggleLabel = (labelName) => {
        if (selectedLabels.includes(labelName)) {
            setSelectedLabels(selectedLabels.filter(l => l !== labelName));
        } else {
            setSelectedLabels([...selectedLabels, labelName]);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 py-4 flex-row items-center bg-background border-b border-border">
                <TouchableOpacity
                    className="w-10 h-10 mr-4 items-center justify-center rounded-xl bg-card border border-border"
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-white">Add Repository</Text>
            </View>

            <ScrollView className="p-6">
                {step === 1 && (
                    <View>
                        <Text className="text-muted mb-6 text-base">
                            Enter the GitHub repository URL you want to track. We'll fetch the available labels for you.
                        </Text>
                        <Input
                            placeholder="https://github.com/owner/repo"
                            value={url}
                            onChangeText={setUrl}
                            icon={Search}
                        />
                        <Button
                            title="Find Repository"
                            onPress={handlePreview}
                            loading={loading}
                        />
                    </View>
                )}

                {step === 2 && repoData && (
                    <View>
                        <Card className="mb-6 bg-brand/5 border-brand/20">
                            <Text className="text-xl font-bold text-white mb-1">{repoData.owner}/{repoData.name}</Text>
                            <Text className="text-muted text-sm" numberOfLines={2}>{repoData.description}</Text>
                        </Card>

                        <Text className="text-lg font-bold text-white mb-4">Select Labels to Track</Text>

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

            {step === 2 && (
                <View className="absolute bottom-10 left-6 right-6">
                    <Button
                        title={`Subscribe to ${selectedLabels.length} labels`}
                        onPress={handleSubscribe}
                        loading={loading}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

export default AddRepoScreen;
