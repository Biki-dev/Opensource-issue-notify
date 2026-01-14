import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../components/UI';

const BillingScreen = () => {
    const [period, setPeriod] = useState('monthly');

    const handleSelectPlan = (plan) => {
        Alert.alert('Plan Selected', `You chose the ${plan} plan. Integrate payments here later.`);
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-6 pt-2 pb-4 bg-white border-b border-gray-100">
                <Text className="text-2xl font-bold text-gray-900 mb-1">Billing & Plans</Text>
                <Text className="text-gray-500">Choose the plan that fits your needs</Text>
            </View>

            <View className="flex-row mx-6 mt-4 bg-gray-100 rounded-2xl p-1">
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-2xl ${period === 'monthly' ? 'bg-white' : ''}`}
                    onPress={() => setPeriod('monthly')}
                >
                    <Text className={`text-center font-semibold ${period === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Monthly
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-2xl ${period === 'yearly' ? 'bg-white' : ''}`}
                    onPress={() => setPeriod('yearly')}
                >
                    <Text className={`text-center font-semibold ${period === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Yearly
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="p-6">
                <Card className="mb-4">
                    <Text className="text-xl font-bold text-gray-900 mb-1">Free</Text>
                    <Text className="text-gray-500 mb-3">Perfect to get started</Text>
                    <Text className="text-3xl font-extrabold mb-2">₹0</Text>
                    <Text className="text-gray-400 mb-3">1 repository • 5 label subscriptions • Email notifications</Text>
                    <Button title="Get Started" onPress={() => handleSelectPlan('Free')} />
                </Card>

                <Card className="border border-yellow-400">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-xl font-bold text-gray-900">Pro</Text>
                        <Text className="text-xs font-bold text-yellow-500 bg-yellow-100 px-2 py-1 rounded-full">POPULAR</Text>
                    </View>
                    <Text className="text-gray-500 mb-3">For power users</Text>
                    <Text className="text-3xl font-extrabold mb-2">₹499<Text className="text-base font-normal">/month</Text></Text>
                    <Text className="text-gray-400 mb-3">10 repositories • Unlimited labels • 1h checks • Priority support</Text>
                    <Button title="Current Plan" onPress={() => handleSelectPlan('Pro')} />
                </Card>
            </View>
        </SafeAreaView>
    );
};

export default BillingScreen;
