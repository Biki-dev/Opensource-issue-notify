import React, { useState, useContext } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { Card, Button, shadowStyles, SectionHeader } from '../components/UI';
import { Zap, Crown, CheckCircle2, Bell, Sparkles, CreditCard, ShieldCheck } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { StatusBar } from 'expo-status-bar';

const BillingScreen = ({ navigation }) => {
    const { unreadCount } = useContext(AuthContext);
    const [period, setPeriod] = useState('monthly');

    const handleSelectPlan = (plan) => {
        Alert.alert('Checkout', `Redirecting to secure payment for ${plan} plan...`);
    };

    const FeatureItem = ({ text, included = true }) => (
        <View className="flex-row items-center mb-4">
            <View className={included ? "bg-success/20 p-1 rounded-full mr-3" : "bg-muted/10 p-1 rounded-full mr-3"}>
                <CheckCircle2 size={16} color={included ? "#10B981" : "#94A3B8"} />
            </View>
            <Text className={included ? "text-primary text-sm font-inter-medium" : "text-muted text-sm font-inter-medium"}>{text}</Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 pt-4 pb-4 flex-row justify-between items-center">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                >
                    <Text className="text-4xl font-poppins-bold text-primary">Pricing</Text>
                </MotiView>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    className="w-12 h-12 rounded-2xl bg-white border border-border items-center justify-center shadow-sm"
                    style={shadowStyles.light}
                >
                    <Bell size={22} color="#0F172A" />
                    {unreadCount > 0 && (
                        <View className="absolute top-2.5 right-2.5 w-3 h-3 bg-danger rounded-full border-2 border-white" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
                {/* Coming Soon Message */}
                <MotiView
                    from={{ opacity: 0, translateY: 50 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 800, delay: 200 }}
                    className="flex-1 justify-center items-center mt-20"
                >
                    <View className="w-24 h-24 rounded-full bg-brand/10 items-center justify-center mb-8">
                        <Sparkles size={48} color="#6366F1" />
                    </View>
                    <Text className="text-3xl font-poppins-bold text-primary mb-4">Coming Soon</Text>
                    <Text className="text-muted text-lg font-inter-medium text-center px-8">
                        Subscription features will be added shortly. Stay tuned!
                    </Text>
                </MotiView>

                {/* Original Content (Commented Out) */}
                {/*
                // Pricing Toggle 
                <View className="items-center mt-4 mb-10">
                    <View className="bg-slate-100 rounded-2xl p-1.5 border border-border flex-row">
                        <TouchableOpacity
                            onPress={() => setPeriod('monthly')}
                            className="relative z-10"
                        >
                            <MotiView
                                animate={{
                                    backgroundColor: period === 'monthly' ? '#6366F1' : 'transparent',
                                }}
                                className="px-8 py-3 rounded-xl"
                            >
                                <Text className={`font-poppins-semibold text-sm ${period === 'monthly' ? 'text-white' : 'text-muted'}`}>
                                    Monthly
                                </Text>
                            </MotiView>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setPeriod('yearly')}
                            className="relative z-10 ml-1"
                        >
                            <MotiView
                                animate={{
                                    backgroundColor: period === 'yearly' ? '#6366F1' : 'transparent',
                                }}
                                className="px-8 py-3 rounded-xl flex-row items-center"
                            >
                                <Text className={`font-poppins-semibold text-sm ${period === 'yearly' ? 'text-white' : 'text-muted'}`}>
                                    Yearly
                                </Text>
                                <View className="bg-success/20 ml-2 px-1.5 py-0.5 rounded-md">
                                    <Text className="text-[10px] font-bold text-success">-20%</Text>
                                </View>
                            </MotiView>
                        </TouchableOpacity>
                    </View>
                </View>

                // Free Plan 
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: 100 }}
                >
                    <Card className="p-8 mb-8 border border-border">
                        <View className="flex-row items-center mb-6">
                            <View className="w-12 h-12 rounded-2xl bg-slate-50 items-center justify-center mr-4 shadow-sm">
                                <Zap size={24} color="#6366F1" />
                            </View>
                            <View>
                                <Text className="text-2xl font-poppins-bold text-primary">Starter</Text>
                                <Text className="text-muted text-sm font-inter-medium">Perfect for indie devs</Text>
                            </View>
                        </View>

                        <View className="flex-row items-baseline mb-8">
                            <Text className="text-5xl font-poppins-bold text-primary">$0</Text>
                            <Text className="text-muted text-base ml-2 font-inter-medium">/month</Text>
                        </View>

                        <FeatureItem text="1 Active Repository" />
                        <FeatureItem text="5 Label Subscriptions" />
                        <FeatureItem text="Email Notifications" />
                        <FeatureItem text="24h Check Interval" />
                        <FeatureItem text="Community Support" />

                        <Button
                            variant="outline"
                            title="Get Started"
                            onPress={() => handleSelectPlan('Starter')}
                            className="mt-6"
                        />
                    </Card>
                </MotiView>

                // Pro Plan 
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: 200 }}
                >
                    <Card
                        className="p-8 mb-8 border-2 border-brand relative overflow-hidden"
                        containerStyle={{ backgroundColor: '#FFFFFF' }}
                    >
                        // Glow Gradient Effect
                        <MotiView
                            from={{ opacity: 0.1, scale: 0.8 }}
                            animate={{ opacity: 0.3, scale: 1.2 }}
                            transition={{ loop: true, type: 'timing', duration: 3000, repeatReverse: true }}
                            style={{
                                position: 'absolute',
                                top: -100,
                                right: -100,
                                width: 300,
                                height: 300,
                                borderRadius: 150,
                                backgroundColor: '#6366F1',
                                filter: 'blur(50px)',
                            }}
                        />

                        <View className="absolute top-6 right-6">
                            <MotiView
                                from={{ scale: 0.9, opacity: 0.8 }}
                                animate={{ scale: 1.1, opacity: 1 }}
                                transition={{ loop: true, type: 'timing', duration: 1500, repeatReverse: true }}
                                className="bg-brand px-4 py-1.5 rounded-full"
                            >
                                <Text className="text-[10px] font-poppins-bold text-white uppercase tracking-widest">Popular</Text>
                            </MotiView>
                        </View>

                        <View className="flex-row items-center mb-6">
                            <View className="w-12 h-12 rounded-2xl bg-brand items-center justify-center mr-4">
                                <Crown size={24} color="white" />
                            </View>
                            <View>
                                <Text className="text-2xl font-poppins-bold text-primary">Professional</Text>
                                <Text className="text-muted text-sm font-inter-medium">For power maintainers</Text>
                            </View>
                        </View>

                        <View className="flex-row items-baseline mb-8">
                            <Text className="text-5xl font-poppins-bold text-primary">
                                {period === 'monthly' ? '$12' : '$10'}
                            </Text>
                            <Text className="text-muted text-base ml-2 font-inter-medium">
                                /month {period === 'yearly' && ' (billed yearly)'}
                            </Text>
                        </View>

                        <FeatureItem text="Unlimited Repositories" />
                        <FeatureItem text="Unlimited Label Subscriptions" />
                        <FeatureItem text="Push + SMS + Email Notifications" />
                        <FeatureItem text="Real-time Polling (15m)" />
                        <FeatureItem text="Priority maintenance support" />
                        <FeatureItem text="Advanced Analytics" />

                        <Button
                            variant="primary"
                            icon={Sparkles}
                            title="Upgrade to Pro"
                            onPress={() => handleSelectPlan('Pro')}
                            className="mt-6"
                        />
                    </Card>
                </MotiView>

                // Trust Section 
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 500 }}
                    className="items-center py-6"
                >
                    <View className="flex-row items-center mb-4">
                        <ShieldCheck size={16} color="#10B981" className="mr-2" />
                        <Text className="text-muted text-xs font-inter-semibold uppercase tracking-wider">Secure Payments by Stripe</Text>
                    </View>
                    <Text className="text-muted text-center text-xs px-10 leading-5">
                        Cancel or change your plan at any time. All data remains private and secure.
                    </Text>
                </MotiView>
                */}
            </ScrollView>
        </SafeAreaView>
    );
};

export default BillingScreen;