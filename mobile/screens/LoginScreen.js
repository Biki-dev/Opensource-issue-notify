import React, { useContext, useState } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, shadowStyles } from '../components/UI';
import { Mail, Lock, User, Github, Eye, EyeOff } from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';

const LoginScreen = ({ navigation }) => {
    const { login, signup, loginWithGitHub } = useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const validateEmail = (text) => {
        setEmail(text);
        if (text && !/\S+@\S+\.\S+/.test(text)) {
            setEmailError('Please enter a valid email address');
        } else {
            setEmailError('');
        }
    };

    const handleSubmit = async () => {
        if (emailError || !email || !password || (!isLogin && !name)) {
            Alert.alert('Validation Error', 'Please fill all fields correctly.');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                console.log('Login successful, should navigate to dashboard');
            } else {
                await signup(name, email, password);
                console.log('Signup successful, should navigate to dashboard');
            }
            // Navigation happens automatically via App.js when userToken changes
        } catch (e) {
            console.error('Auth error:', e);
            const errorMessage = e.response?.data?.message || e.message || 'Something went wrong.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubLogin = async () => {
        try {
            setLoading(true);
            await loginWithGitHub();
            console.log('GitHub login successful, should navigate to dashboard');
            // Navigation happens automatically via App.js when userToken changes
        } catch (e) {
            console.error('GitHub auth error:', e);
            Alert.alert('Error', 'GitHub authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Header Section */}
                    <View className="pt-12 pb-8">
                        {/* App Logo/Icon */}
                        <MotiView
                            from={{ opacity: 0, scale: 0.8, translateY: -20 }}
                            animate={{ opacity: 1, scale: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 400 }}
                            className="items-center mb-8"
                        >
                            <View className="w-32 h-32 rounded-[28px] items-center justify-center">
                                <Image
                                    source={require('../assets/logo.png')}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="contain"
                                />
                            </View>
                        </MotiView>

                        {/* Title */}
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 100 }}
                        >
                            <Text className="text-[32px] font-poppins-bold text-primary mb-2 text-center">
                                {isLogin ? 'Welcome Back!' : 'Create Account'}
                            </Text>
                            <Text className="text-muted text-base font-inter-medium text-center px-8">
                                {isLogin
                                    ? 'Sign in to continue tracking issues'
                                    : 'Start tracking GitHub issues today'}
                            </Text>
                        </MotiView>
                    </View>

                    {/* Form Section */}
                    <View className="flex-1">
                        <MotiView
                            from={{ opacity: 0, translateY: 30 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 200 }}
                        >
                            {/* GitHub Button */}
                            <TouchableOpacity
                                onPress={handleGitHubLogin}
                                disabled={loading}
                                className="bg-[#24292F] h-14 rounded-2xl flex-row items-center justify-center mb-6"
                                style={shadowStyles.light}
                                activeOpacity={0.8}
                            >
                                <Github size={20} color="white" />
                                <Text className="text-white font-poppins-semibold text-base ml-3">
                                    Continue with GitHub
                                </Text>
                            </TouchableOpacity>

                            {/* Divider */}
                            <View className="flex-row items-center mb-6">
                                <View className="flex-1 h-[1px] bg-border" />
                                <Text className="text-muted text-sm font-inter-medium px-4">or</Text>
                                <View className="flex-1 h-[1px] bg-border" />
                            </View>

                            {/* Name Field (Signup Only) */}
                            {!isLogin && (
                                <MotiView
                                    from={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 90 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ type: 'timing', duration: 300 }}
                                >
                                    <Input
                                        placeholder="Full Name"
                                        value={name}
                                        onChangeText={setName}
                                        icon={User}
                                        autoCapitalize="words"
                                    />
                                </MotiView>
                            )}

                            {/* Email Field */}
                            <Input
                                placeholder="Email Address"
                                value={email}
                                onChangeText={validateEmail}
                                icon={Mail}
                                error={emailError}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            {/* Password Field with Toggle */}
                            <View className="mb-6">
                                <View className={`bg-white h-16 rounded-2xl border ${emailError ? 'border-danger' : 'border-border'} px-5 flex-row items-center shadow-sm`} style={shadowStyles.light}>
                                    <Lock size={24} color="#94A3B8" className="mr-4" />
                                    <TextInput
                                        className="flex-1 text-base text-primary font-inter-medium"
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Password"
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        className="ml-2 p-2"
                                        activeOpacity={0.7}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} color="#94A3B8" />
                                        ) : (
                                            <Eye size={20} color="#94A3B8" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Submit Button */}
                            <Button
                                title={isLogin ? 'Sign In' : 'Create Account'}
                                onPress={handleSubmit}
                                loading={loading}
                                className="mb-6"
                            />

                            {/* Agreement Text (Signup Only) */}
                            {!isLogin && (
                                <MotiView
                                    from={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mb-6 mt-6"
                                >
                                    <Text className="text-muted text-xs text-center font-inter-medium leading-5">
                                        By creating an account, you agree to our{' '}
                                        <Text className="text-brand font-inter-semibold">
                                            Terms & Privacy Policy
                                        </Text>
                                    </Text>
                                </MotiView>
                            )}
                        </MotiView>
                    </View>

                    {/* Footer */}
                    <View className="pb-8 pt-4">
                        <View className="flex-row justify-center items-center">
                            <Text className="text-muted font-inter-medium text-sm">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsLogin(!isLogin);
                                    setEmailError('');
                                    setName('');
                                    setEmail('');
                                    setPassword('');
                                }}
                                activeOpacity={0.7}
                            >
                                <Text className="text-brand font-poppins-semibold text-sm">
                                    {isLogin ? 'Sign up' : 'Sign in'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginScreen;