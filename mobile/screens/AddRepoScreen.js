import React, { useContext, useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Button, Input, Card, LabelChip, shadowStyles } from '../components/UI';
import { Search, CheckCircle, AlertTriangle, ArrowLeft, Github, Info, Tag, Star } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { StatusBar } from 'expo-status-bar';

const AddRepoScreen = ({ navigation }) => {
    const { userToken, BASE_URL } = useContext(AuthContext);
    const [step, setStep] = useState(1);
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [repoData, setRepoData] = useState(null);
    const [selectedLabels, setSelectedLabels] = useState([]);

    const handlePreview = async () => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl.includes('github.com')) {
            Alert.alert('Invalid URL', 'Please enter a valid GitHub repository URL.');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/repos/preview`,
                { url: trimmedUrl },
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
                { url: url.trim(), labels: selectedLabels },
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
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 py-4 flex-row items-center">
                <TouchableOpacity
                    className="w-12 h-12 items-center justify-center rounded-2xl bg-white border border-border shadow-sm"
                    style={shadowStyles.light}
                    onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
                >
                    <ArrowLeft size={22} color="#0F172A" />
                </TouchableOpacity>
                <View className="ml-4">
                    <Text className="text-2xl font-poppins-bold text-primary">Add Repository</Text>
                    <Text className="text-muted text-xs font-inter-semibold uppercase tracking-wider">Step {step} of 2</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
                    <AnimatePresence exitBeforeEnter>
                        {step === 1 ? (
                            <MotiView
                                key="step1"
                                from={{ opacity: 0, translateX: -20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: 20 }}
                                className="mt-6"
                            >
                                <View className="bg-brand/10 p-6 rounded-3xl border border-brand/20 mb-8">
                                    <View className="flex-row items-center mb-4">
                                        <Github size={24} color="#6366F1" />
                                        <Text className="text-primary font-poppins-bold text-lg ml-3">Source Information</Text>
                                    </View>
                                    <Text className="text-muted font-inter-medium leading-6">
                                        Paste the full GitHub URL. We'll automatically identify the owner, name, and available issue labels.
                                    </Text>
                                </View>

                                <Input
                                    label="Repository URL"
                                    placeholder="https://github.com/facebook/react"
                                    value={url}
                                    onChangeText={setUrl}
                                    icon={Search}
                                />

                                <Button
                                    title="Connect Repository"
                                    onPress={handlePreview}
                                    loading={loading}
                                    className="mt-6"
                                />

                                <View className="mt-10 flex-row items-center justify-center">
                                    <Info size={14} color="#94A3B8" className="mr-2" />
                                    <Text className="text-muted text-xs font-inter-medium italic text-center">
                                        Currently supporting public repositories only
                                    </Text>
                                </View>
                            </MotiView>
                        ) : (
                            <MotiView
                                key="step2"
                                from={{ opacity: 0, translateX: 20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: -20 }}
                                className="mt-6"
                            >
                                {repoData && (
                                    <>
                                        <Card className="p-6 mb-8 border border-brand/20 bg-slate-50">
                                            <View className="flex-row items-center mb-4">
                                                <View className="w-14 h-14 rounded-2xl bg-brand items-center justify-center mr-4">
                                                    <Github size={28} color="white" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-xl font-poppins-bold text-primary">{repoData.owner}/{repoData.name}</Text>
                                                    <View className="flex-row items-center mt-1">
                                                        <Star size={12} color="#D97706" className="mr-1" />
                                                        <Text className="text-muted text-[10px] font-inter-bold uppercase">Popular Repository</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <Text className="text-muted text-sm font-inter-medium leading-5" numberOfLines={2}>
                                                {repoData.description || 'No description provided for this repository.'}
                                            </Text>
                                        </Card>

                                        <View className="flex-row items-center justify-between mb-6">
                                            <View className="flex-row items-center">
                                                <Tag size={18} color="#6366F1" className="mr-2" />
                                                <Text className="text-xl font-poppins-bold text-primary">Select Labels</Text>
                                            </View>
                                            <View className="bg-brand/10 px-3 py-1 rounded-full border border-brand/10">
                                                <Text className="text-brand text-xs font-poppins-bold">{selectedLabels.length} Selected</Text>
                                            </View>
                                        </View>

                                        <View className="flex-row flex-wrap">
                                            {repoData.labels.map((label, index) => (
                                                <MotiView
                                                    key={label.name}
                                                    from={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: index * 30 }}
                                                >
                                                    <LabelChip
                                                        label={label.name}
                                                        selected={selectedLabels.includes(label.name)}
                                                        onPress={() => toggleLabel(label.name)}
                                                    />
                                                </MotiView>
                                            ))}
                                        </View>

                                        <View className="mt-10 mb-6">
                                            <Button
                                                title={`Subscribe to ${selectedLabels.length} Label${selectedLabels.length !== 1 ? 's' : ''}`}
                                                onPress={handleSubscribe}
                                                loading={loading}
                                                disabled={selectedLabels.length === 0}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setStep(1)}
                                                className="items-center py-4 mt-2"
                                            >
                                                <Text className="text-muted font-inter-semibold">Back to URL</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </MotiView>
                        )}
                    </AnimatePresence>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default AddRepoScreen;
