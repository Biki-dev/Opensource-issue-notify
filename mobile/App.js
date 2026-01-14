import React, { useContext } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import BillingScreen from './screens/BillingScreen';
import SettingsScreen from './screens/SettingsScreen';
import AddRepoScreen from './screens/AddRepoScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import EditLabelsScreen from './screens/EditLabelsScreen';
import { Home, Bell, CreditCard, Settings } from 'lucide-react-native';

// 1. Import global.css for nativewind
import './global.css';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AppTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#CEFF00',
                tabBarInactiveTintColor: '#71717A',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    marginTop: -4,
                },
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: '#18181B',
                    borderTopWidth: 0,
                    height: 80,
                    paddingTop: 10,
                    paddingBottom: 20,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    elevation: 0,
                },
                tabBarIcon: ({ color, focused, size }) => {
                    let IconComponent;
                    if (route.name === 'HomeTab') IconComponent = Home;
                    else if (route.name === 'SubscriptionsTab') IconComponent = Bell;
                    else if (route.name === 'BillingTab') IconComponent = CreditCard;
                    else if (route.name === 'SettingsTab') IconComponent = Settings;

                    return (
                        <View className="items-center">
                            {focused && <View className="w-1 h-1 bg-brand rounded-full mb-1" />}
                            <IconComponent color={color} size={24} />
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen name="HomeTab" component={DashboardScreen} options={{ title: 'Home' }} />
            <Tab.Screen name="SubscriptionsTab" component={HomeScreen} options={{ title: 'Subscriptions' }} />
            <Tab.Screen name="BillingTab" component={BillingScreen} options={{ title: 'Billing' }} />
            <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Tab.Navigator>
    );
};

const AppNav = () => {
    const { userToken, isLoading } = useContext(AuthContext);

    if (isLoading) {
        return null; // Or splash
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                {userToken === null ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={AppTabs} />
                        <Stack.Screen name="AddRepo" component={AddRepoScreen} options={{ presentation: 'modal' }} />
                        <Stack.Screen name="EditLabels" component={EditLabelsScreen} options={{ presentation: 'modal' }} />
                        <Stack.Screen name="Notifications" component={NotificationsScreen} />
                    </>
                )}
            </Stack.Navigator>
            <StatusBar style="auto" />
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <AppNav />
        </AuthProvider>
    );
}
