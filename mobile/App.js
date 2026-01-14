import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
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
import { MotiView } from 'moti';
import { useFonts, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display';

// 1. Import global.css for nativewind
import './global.css';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const { width } = useWindowDimensions();
    const tabWidth = width / state.routes.length;
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        setIsMoving(true);
        const timer = setTimeout(() => setIsMoving(false), 300);
        return () => clearTimeout(timer);
    }, [state.index]);

    return (
        <View style={{
            flexDirection: 'row',
            backgroundColor: '#FFFFFF',
            height: 85,
            paddingBottom: 25,
            paddingTop: 12,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopWidth: 1,
            borderTopColor: '#E9E3DD',
            shadowColor: '#111111',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 10,
        }}>
            {/* Animated Indicator */}
            <MotiView
                animate={{
                    translateX: (state.index * tabWidth) + (tabWidth / 2) - (isMoving ? 10 : 3),
                    width: isMoving ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                }}
                transition={{
                    type: 'timing',
                    duration: 250,
                }}
                style={{
                    position: 'absolute',
                    top: 6,
                    backgroundColor: '#D97706',
                }}
            />

            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.title !== undefined ? options.title : route.name;
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                let IconComponent;
                if (route.name === 'HomeTab') IconComponent = Home;
                else if (route.name === 'SubscriptionsTab') IconComponent = Bell;
                else if (route.name === 'BillingTab') IconComponent = CreditCard;
                else if (route.name === 'SettingsTab') IconComponent = Settings;

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        activeOpacity={0.7}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <MotiView
                            animate={{
                                scale: isFocused ? 1.1 : 1,
                                translateY: isFocused ? -2 : 0,
                            }}
                        >
                            <IconComponent
                                color={isFocused ? '#D97706' : '#5B6478'}
                                size={24}
                            />
                        </MotiView>
                        <Text style={{
                            color: isFocused ? '#D97706' : '#5B6478',
                            fontSize: 10,
                            fontFamily: 'Inter_600SemiBold',
                            marginTop: 4
                        }}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const AppTabs = () => {
    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
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
    const [fontsLoaded] = useFonts({
        Poppins_600SemiBold,
        Poppins_700Bold,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Montserrat_700Bold,
        JetBrainsMono_400Regular,
        PlayfairDisplay_500Medium,
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <AuthProvider>
            <AppNav />
        </AuthProvider>
    );
}
