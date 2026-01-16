import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';
import { Github, Bell, CircleDot, GitFork, Star } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
    const [currentStep, setCurrentStep] = useState(0);

    // Auto-advance from welcome screen after 2.5 seconds
    useEffect(() => {
        if (currentStep === 0) {
            const timer = setTimeout(() => {
                setCurrentStep(1);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    const handleSkip = async () => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            // Use navigation.navigate instead of replace
            navigation.navigate('Login');
        } catch (error) {
            console.log('Error saving onboarding status:', error);
        }
    };

    const handleContinue = () => {
        if (currentStep === 2) {
            handleSkip();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const renderDots = () => {
        if (currentStep === 0) return null;
        return (
            <View className="flex-row justify-center mb-8">
                {[1, 2, 3].map((dot, index) => (
                    <MotiView
                        key={dot}
                        animate={{
                            width: currentStep === index + 1 ? 24 : 8,
                            backgroundColor: currentStep === index + 1 ? '#6366F1' : '#E2E8F0',
                        }}
                        transition={{ type: 'timing', duration: 300 }}
                        className="h-2 rounded-full mx-1"
                    />
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />

            {currentStep === 0 ? (
                <WelcomeScreen />
            ) : currentStep === 1 ? (
                <NeverMissScreen onSkip={handleSkip} onContinue={handleContinue} />
            ) : (
                <TrackAllReposScreen onSkip={handleSkip} onContinue={handleContinue} />
            )}

            {renderDots()}
        </SafeAreaView>
    );
};

// Screen 1: Welcome (Auto-advances)
const WelcomeScreen = () => {
    return (
        <View className="flex-1 items-center justify-center px-6">
            <MotiView
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 600 }}
                className="items-center"
            >
                {/* App Icon */}
                <View className="relative mb-8">
                    <View className="w-32 h-32 bg-brand rounded-[40px] items-center justify-center shadow-2xl">
                        <Github size={64} color="white" strokeWidth={2.5} />
                    </View>

                    {/* Glow Effect */}
                    <MotiView
                        from={{ opacity: 0.3, scale: 0.9 }}
                        animate={{ opacity: 0.6, scale: 1.1 }}
                        transition={{
                            loop: true,
                            type: 'timing',
                            duration: 2000,
                            repeatReverse: true,
                        }}
                        className="absolute -inset-4 bg-brand/20 rounded-[48px] blur-xl -z-10"
                    />
                </View>

                {/* App Name */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 300, type: 'timing', duration: 500 }}
                >
                    <Text className="text-4xl font-poppins-bold text-primary mb-2">
                        Issue Tracker
                    </Text>
                </MotiView>

                {/* Loading Dots */}
                <View className="flex-row mt-12">
                    {[0, 1, 2].map((i) => (
                        <MotiView
                            key={i}
                            from={{ opacity: 0.3, translateY: 0 }}
                            animate={{ opacity: 1, translateY: -8 }}
                            transition={{
                                loop: true,
                                type: 'timing',
                                duration: 600,
                                delay: i * 200,
                                repeatReverse: true,
                            }}
                            className="w-2 h-2 bg-brand rounded-full mx-1"
                        />
                    ))}
                </View>
            </MotiView>
        </View>
    );
};

// Screen 2: Never Miss an Issue
const NeverMissScreen = ({ onSkip, onContinue }) => {
    const notifications = [
        { id: 1, type: 'new', title: 'New Issue', desc: 'Bug: App crashes on startup #127', time: '2m ago' },
        { id: 2, type: 'updated', title: 'Updated', desc: 'Feature request: Dark mode #98', time: '15m ago' },
    ];

    return (
        <View className="flex-1 px-6">
            {/* Skip Button */}
            <TouchableOpacity
                onPress={onSkip}
                className="self-end py-3 px-4 mb-4"
                activeOpacity={0.7}
            >
                <View className="flex-row items-center">
                    <Text className="text-muted font-inter-semibold text-base">Skip</Text>
                    <Text className="text-muted ml-1 text-lg">›</Text>
                </View>
            </TouchableOpacity>

            {/* Notification Cards */}
            <View className="flex-1 justify-center mb-12">
                {notifications.map((notif, index) => (
                    <MotiView
                        key={notif.id}
                        from={{ opacity: 0, translateX: -50 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{
                            type: 'timing',
                            duration: 500,
                            delay: index * 200,
                        }}
                        className="mb-4"
                    >
                        <View className="bg-white rounded-2xl p-4 border border-border shadow-sm">
                            <View className="flex-row items-center">
                                <View className="w-14 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center mr-3 ">
                                    {notif.type === "new" ? (
                                        <View className="w-12 h-12 shadow-md rounded-xl items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                                            <CircleDot size={20} color="#fff" />
                                        </View>
                                    ) : (
                                        <View className="w-12 h-12 shadow-md rounded-xl items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                                            <Bell size={20} color="#fff" />
                                        </View>
                                    )}
                                </View>

                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <Text className="text-sm font-poppins-semibold text-primary mb-1">{notif.title}</Text>
                                        <Text className="text-[10px] text-muted ml-2">{notif.time}</Text>
                                    </View>
                                    <Text className="text-sm text-muted font-inter-medium" numberOfLines={1}>
                                        {notif.desc}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </MotiView>
                ))}
            </View>

            {/* Content */}
            <MotiView
                from={{ opacity: 0, translateY: 30 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 400, type: 'timing', duration: 600 }}
                className="mb-8"
            >
                <Text className="text-3xl font-poppins-bold text-primary text-center mb-4">
                    Never miss an issue
                </Text>
                <Text className="text-base text-muted font-inter-medium text-center leading-6 px-4">
                    Get instant notifications when new issues are opened or existing ones are updated
                </Text>
            </MotiView>

            {/* Continue Button */}
            <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 600, type: 'timing', duration: 400 }}
                className="mb-6"
            >
                <TouchableOpacity
                    onPress={onContinue}
                    className="bg-brand h-14 rounded-3xl items-center justify-center shadow-lg"
                    style={{
                        shadowColor: '#6366F1',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 24,
                        elevation: 12,
                    }}
                >
                    <Text className="text-white font-poppins-semibold text-lg">Continue</Text>
                </TouchableOpacity>
            </MotiView>
        </View>
    );
};

// Screen 3: Track All Repositories
const TrackAllReposScreen = ({ onSkip, onContinue }) => {
    const repos = [
        { name: 'facebook/react', stars: '230k', active: true },
        { name: 'microsoft/vscode', stars: '165k', active: true },
        { name: 'vercel/next.js', stars: '128k', active: true },
    ];

    return (
        <View className="flex-1 px-6">
            {/* Skip Button */}
            <TouchableOpacity
                onPress={onSkip}
                className="self-end py-3 px-4 mb-4"
            >
                <View className="flex-row items-center">
                    <Text className="text-muted font-inter-semibold text-base">Skip</Text>
                    <MotiView
                        from={{ translateX: 0 }}
                        animate={{ translateX: 4 }}
                        transition={{
                            loop: true,
                            type: 'timing',
                            duration: 800,
                            repeatReverse: true,
                        }}
                    >
                        <Text className="text-muted ml-1">›</Text>
                    </MotiView>
                </View>
            </TouchableOpacity>

            {/* Repository Cards */}
            <View className="flex-1 justify-center mb-12">
                {repos.map((repo, index) => (
                    <MotiView
                        key={repo.name}
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            type: 'timing',
                            duration: 400,
                            delay: index * 150,
                        }}
                        className="mb-3"
                    >
                        <View className="bg-white rounded-2xl p-4 border border-border shadow-sm">
                            <View className="flex-row items-center">
                                <View className="w-12 h-12 rounded-xl bg-brand/10 items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] mr-3 shadow-md">
                                    <GitFork size={20} color="#fff" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-poppins-semibold text-primary mb-1">
                                        {repo.name}
                                    </Text>
                                    <View className="flex-row items-center">
                                        <Star size={12} color="#94A3B8" />
                                        <Text className="text-xs text-muted ml-1 font-inter-medium">
                                            {repo.stars}
                                        </Text>
                                        <View className="ml-3 flex-row items-center">
                                            <View className="w-2 h-2 rounded-full bg-success mr-1.5" />
                                            <Text className="text-[10px] text-success font-inter-semibold uppercase">
                                                Active
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </MotiView>
                ))}
            </View>

            {/* Content */}
            <MotiView
                from={{ opacity: 0, translateY: 30 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 500, type: 'timing', duration: 600 }}
                className="mb-8"
            >
                <Text className="text-3xl font-poppins-bold text-primary text-center mb-4">
                    Track all your repositories
                </Text>
                <Text className="text-base text-muted font-inter-medium text-center leading-6 px-4">
                    Monitor issues across multiple GitHub repos in one unified dashboard
                </Text>
            </MotiView>

            {/* Continue Button */}
            <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 700, type: 'timing', duration: 400 }}
                className="mb-6"
            >
                <TouchableOpacity
                    onPress={onContinue}
                    className="bg-brand h-16 rounded-3xl items-center justify-center shadow-lg"
                    style={{
                        shadowColor: '#6366F1',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 24,
                        elevation: 12,
                    }}
                >
                    <Text className="text-white font-poppins-semibold text-lg">Continue</Text>
                </TouchableOpacity>
            </MotiView>
        </View>
    );
};

export default OnboardingScreen;