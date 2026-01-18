import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, useWindowDimensions, Platform, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import BillingScreen from './screens/BillingScreen';
import SettingsScreen from './screens/SettingsScreen';
import AddRepoScreen from './screens/AddRepoScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import EditLabelsScreen from './screens/EditLabelsScreen';
import GitHubTokenSettings from './screens/GitHubTokenSettings';
import { Home, Bell, CreditCard, Settings } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useFonts, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display';
import { setupNotificationListeners, verifyPermissions } from './utils/notifications';

// Import global.css for nativewind
import './global.css';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const tabWidth = width / state.routes.length;

    return (
        <View style={{
            flexDirection: 'row',
            backgroundColor: '#FFFFFF',
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 12,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 20,
        }}>
            <MotiView
                animate={{
                    translateX: (state.index * tabWidth) + (tabWidth / 2) - 20,
                }}
                transition={{
                    type: 'timing',
                    duration: 300,
                }}
                style={{
                    position: 'absolute',
                    top: 0,
                    width: 40,
                    height: 3,
                    backgroundColor: '#6366F1',
                    borderRadius: 3,
                    shadowColor: '#6366F1',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.8,
                    shadowRadius: 10,
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
                                scale: isFocused ? 1.15 : 1,
                                translateY: isFocused ? -2 : 0,
                            }}
                            transition={{
                                type: 'timing',
                                duration: 200,
                            }}
                        >
                            <IconComponent
                                color={isFocused ? '#6366F1' : '#94A3B8'}
                                size={28}
                                strokeWidth={isFocused ? 2.5 : 2}
                            />
                        </MotiView>
                        <Text style={{
                            color: isFocused ? '#0F172A' : '#64748B',
                            fontSize: 11,
                            fontFamily: isFocused ? 'Poppins_600SemiBold' : 'Inter_500Medium',
                            marginTop: 6
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

// Custom Loading/Splash Screen to prevent "Empty Grid" flicker
const LoadingScreen = () => {
    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <StatusBar style="dark" />
            <MotiView
                from={{ opacity: 0.5, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1.1 }}
                transition={{
                    type: 'timing',
                    duration: 1000,
                    loop: true,
                    repeatReverse: true,
                }}
            >
                <MotiView
                    from={{ rotate: '0deg' }}
                    animate={{ rotate: '360deg' }}
                    transition={{
                        type: 'timing',
                        duration: 3000,
                        loop: true,
                    }}
                    style={{
                        position: 'absolute',
                        top: -10,
                        left: -10,
                        right: -10,
                        bottom: -10,
                        borderWidth: 2,
                        borderColor: '#6366F1',
                        borderStyle: 'dashed',
                        borderRadius: 40,
                        opacity: 0.2
                    }}
                />
                <View style={{ width: 100, height: 100 }}>
                    <View style={{ width: '100%', height: '100%' }}>
                        <View style={{ padding: 10 }}>
                            {/* Small placeholder if assets haven't loaded yet, or just the image */}
                            <View style={{ width: 80, height: 80, backgroundColor: '#F8FAFC', borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
                                <Image source={require('./assets/logo.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
                            </View>
                        </View>
                    </View>
                </View>
            </MotiView>
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 500 }}
                style={{ marginTop: 24 }}
            >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B', letterSpacing: 2 }}>
                    ISSUE WATCH
                </Text>
            </MotiView>
        </View >
    );
};

const AppNav = () => {
    const { userToken, isLoading } = useContext(AuthContext);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
    const [navReady, setNavReady] = useState(false);
    const navigationRef = React.useRef();
    useEffect(() => {
        checkOnboarding();
        verifyPermissions();
    }, []);

    // Setup notification listeners when both navigation is ready and userToken exists
    useEffect(() => {
        if (navReady && userToken && navigationRef.current) {
            const cleanup = setupNotificationListeners(navigationRef.current);
            return cleanup;
        }
    }, [navReady, userToken]);

    // Re-check onboarding status when userToken changes
    useEffect(() => {
        if (userToken) {
            checkOnboarding();
        }
    }, [userToken]);

    const checkOnboarding = async () => {
        try {
            const value = await AsyncStorage.getItem('hasSeenOnboarding');
            setHasSeenOnboarding(value === 'true');
            console.log('Onboarding status:', value);
        } catch (e) {
            console.log('Error checking onboarding status', e);
            setHasSeenOnboarding(false);
        }
    };

    // Debug logs
    useEffect(() => {
        console.log('AppNav state:', {
            userToken: userToken ? 'exists' : 'null',
            isLoading,
            hasSeenOnboarding
        });
    }, [userToken, isLoading, hasSeenOnboarding]);

    if (isLoading || hasSeenOnboarding === null) {
        return <LoadingScreen />;
    }

    return (
        <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                {!hasSeenOnboarding ? (
                    <>
                        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                    </>
                ) : userToken === null ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={AppTabs} />
                        <Stack.Screen name="AddRepo" component={AddRepoScreen} options={{ presentation: 'modal' }} />
                        <Stack.Screen name="EditLabels" component={EditLabelsScreen} options={{ presentation: 'modal' }} />
                        <Stack.Screen name="GitHubTokenSettings" component={GitHubTokenSettings} options={{ presentation: 'modal' }} />
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
        return <LoadingScreen />;
    }

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <AppNav />
            </AuthProvider>
        </SafeAreaProvider>
    );
}