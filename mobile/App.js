import React, { useContext } from 'react';
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
                tabBarActiveTintColor: '#FACC15',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 0.5,
                    borderTopColor: '#E5E7EB',
                    height: 70,
                    paddingBottom: 10,
                },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'HomeTab') return <Home color={color} size={size} />;
                    if (route.name === 'SubscriptionsTab') return <Bell color={color} size={size} />;
                    if (route.name === 'BillingTab') return <CreditCard color={color} size={size} />;
                    if (route.name === 'SettingsTab') return <Settings color={color} size={size} />;
                    return null;
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
