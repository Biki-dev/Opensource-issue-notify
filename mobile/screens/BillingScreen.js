import React, { useState, useContext } from 'react';
import { View, Text, Alert, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { Card, Button } from '../components/UI';
import { Zap, Crown, CheckCircle2, Bell } from 'lucide-react-native';
import { MotiView } from 'moti';

const BillingScreen = ({ navigation }) => {
    const { unreadCount } = useContext(AuthContext);
    const [period, setPeriod] = useState('monthly');

    const handleSelectPlan = (plan) => {
        Alert.alert('Plan Selected', `You chose the ${plan} plan. Integrate payments here later.`);
    };

    const FeatureItem = ({ text }) => (
        <View className="flex-row items-center mb-3">
            <CheckCircle2 size={18} color="#16A34A" className="mr-3" />
            <Text className="text-muted text-sm font-semibold">{text}</Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 pt-6 pb-4 flex-row justify-between items-center">
                <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                >
                    <Text className="text-3xl font-black text-primary">Billing & Plans</Text>
                    <Text className="text-muted text-sm mt-1 font-medium">Choose the plan that fits your needs</Text>
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

            <View className="flex-row justify-center mt-4 mb-6">
                <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 200 }}>
                    <View className="flex-row bg-card rounded-2xl p-1.5 border border-border">
                        <TouchableOpacity
                            className={`px-8 py-2.5 rounded-xl ${period === 'monthly' ? 'bg-brand' : ''}`}
                            onPress={() => setPeriod('monthly')}
                        >
                            <Text className={`font-bold text-sm ${period === 'monthly' ? 'text-white' : 'text-muted'}`}>
                                Monthly
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`px-6 py-2.5 rounded-xl flex-row items-center ${period === 'yearly' ? 'bg-brand' : ''}`}
                            onPress={() => setPeriod('yearly')}
                        >
                            <Text className={`font-bold text-sm ${period === 'yearly' ? 'text-white' : 'text-muted'}`}>
                                Yearly
                            </Text>
                            <View className="bg-brand/20 ml-2 px-1.5 py-0.5 rounded-md">
                                <Text className="text-[10px] font-bold text-brand">Save 20%</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </MotiView>
            </View>

            <FlatList
                data={[1]}
                keyExtractor={i => i.toString()}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
                renderItem={() => (
                    <View>
                        <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 300 }}>
                            <Card className="mb-6 border border-border">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-10 h-10 rounded-xl bg-brand/10 items-center justify-center mr-4">
                                        <Zap size={22} color="#D97706" />
                                    </View>
                                    <View>
                                        <Text className="text-xl font-black text-primary">Free</Text>
                                        <Text className="text-muted text-xs font-medium">Perfect to get started</Text>
                                    </View>
                                </View>

                                <Text className="text-4xl font-black text-primary mb-6">₹0</Text>

                                <FeatureItem text="1 repository" />
                                <FeatureItem text="5 label subscriptions" />
                                <FeatureItem text="Email notifications" />
                                <FeatureItem text="24h check frequency" />

                                <Button
                                    variant="secondary"
                                    title="Get Started"
                                    onPress={() => handleSelectPlan('Free')}
                                    className="mt-6 h-12 rounded-xl bg-card border border-border"
                                />
                            </Card>
                        </MotiView>

                        <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 400 }}>
                            <Card className="relative overflow-hidden mb-8 border border-border">
                                <View className="absolute top-4 right-4 z-10">
                                    <View className="bg-brand px-3 py-1 rounded-full px-4">
                                        <Text className="text-[10px] font-black text-white uppercase tracking-widest">Popular</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center mb-4">
                                    <View className="w-10 h-10 rounded-xl bg-brand/10 items-center justify-center mr-4">
                                        <Crown size={22} color="#D97706" />
                                    </View>
                                    <View>
                                        <Text className="text-xl font-black text-primary">Pro</Text>
                                        <Text className="text-muted text-xs font-medium">For power users</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-end mb-6">
                                    <Text className="text-4xl font-black text-primary mr-1">₹499</Text>
                                    <Text className="text-muted text-base pb-1 font-medium">/month</Text>
                                </View>

                                <FeatureItem text="10 repositories" />
                                <FeatureItem text="Unlimited label subscriptions" />
                                <FeatureItem text="Push + Email notifications" />
                                <FeatureItem text="1h check frequency" />
                                <FeatureItem text="Priority support" />

                                <Button
                                    title="Current Plan"
                                    onPress={() => handleSelectPlan('Pro')}
                                    className="mt-6 h-12 rounded-xl"
                                />
                            </Card>
                        </MotiView>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

export default BillingScreen;
