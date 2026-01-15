import React, { useContext, useState } from 'react';
import { View, Text, Alert, TouchableOpacity, Dimensions, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, shadowStyles } from '../components/UI';
import { Mail, Lock, Zap, User, Github, Sparkles } from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const { login, signup, loginWithGitHub } = useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

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
            } else {
                await signup(name, email, password);
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubLogin = async () => {
        try {
            setLoading(true);
            await loginWithGitHub();
        } catch (e) {
            Alert.alert('Error', 'GitHub authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#0F172A', '#1E293B', '#334155']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-1"
        >
            <SafeAreaView className="flex-1 px-6">
                <StatusBar style="light" />

                {/* Animated Background Elements */}
                <MotiView
                    from={{ opacity: 0.1, scale: 0.8 }}
                    animate={{ opacity: 0.3, scale: 1.2 }}
                    transition={{ loop: true, type: 'timing', duration: 4000, repeatReverse: true }}
                    style={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 300,
                        height: 300,
                        borderRadius: 150,
                        backgroundColor: '#6366F1',
                    }}
                />
                <MotiView
                    from={{ opacity: 0.1, scale: 1.2 }}
                    animate={{ opacity: 0.2, scale: 0.8 }}
                    transition={{ loop: true, type: 'timing', duration: 5000, repeatReverse: true }}
                    style={{
                        position: 'absolute',
                        bottom: -50,
                        left: -50,
                        width: 200,
                        height: 200,
                        borderRadius: 100,
                        backgroundColor: '#8B5CF6',
                    }}
                />

                <View className="flex-1 justify-center">
                    {/* Logo & Header */}
                    <View className="items-center mb-12">
                        <MotiView
                            from={{ opacity: 0, scale: 0.5, rotate: '-10deg' }}
                            animate={{ opacity: 1, scale: 1, rotate: '0deg' }}
                            transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                            className="relative"
                        >
                            <LinearGradient
                                colors={['#6366F1', '#8B5CF6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="w-28 h-28 rounded-[40px] items-center justify-center mb-6 shadow-2xl"
                                style={shadowStyles.fab}
                            >
                                <Zap size={56} color="white" fill="white" />
                            </LinearGradient>
                            <MotiView
                                from={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 300, type: 'spring' }}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-success rounded-full items-center justify-center border-4 border-[#0F172A]"
                            >
                                <Sparkles size={14} color="white" />
                            </MotiView>
                        </MotiView>

                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 200 }}
                        >
                            <Text className="text-5xl font-poppins-bold text-white text-center tracking-tight">
                                Issue Notify
                            </Text>
                            <Text className="text-slate-300 mt-3 text-lg font-inter-medium text-center px-4">
                                {isLogin ? 'Welcome back!' : 'Join thousands of developers'}
                            </Text>
                        </MotiView>
                    </View>

                    {/* Form Container */}
                    <MotiView
                        from={{ opacity: 0, translateY: 30 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 400, type: 'spring', damping: 20 }}
                    >
                        <View className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 border border-white/20" style={shadowStyles.strong}>
                            {/* GitHub Button */}
                            <TouchableOpacity
                                onPress={handleGitHubLogin}
                                disabled={loading}
                                className="bg-white h-16 rounded-2xl flex-row items-center justify-center mb-6"
                                style={shadowStyles.light}
                            >
                                <Github size={24} color="#0F172A" className="mr-3" />
                                <Text className="text-primary font-poppins-semibold text-lg">
                                    Continue with GitHub
                                </Text>
                            </TouchableOpacity>

                            {/* Divider */}
                            <View className="flex-row items-center mb-6">
                                <View className="flex-1 h-[1px] bg-white/20" />
                                <Text className="text-slate-300 text-sm font-inter-medium px-4">or</Text>
                                <View className="flex-1 h-[1px] bg-white/20" />
                            </View>

                            {/* Name Field (Signup Only) */}
                            {!isLogin && (
                                <MotiView
                                    from={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 90 }}
                                    transition={{ type: 'timing', duration: 300 }}
                                >
                                    <Input
                                        placeholder="Full Name"
                                        value={name}
                                        onChangeText={setName}
                                        icon={User}
                                        className="bg-white/20 border-white/30"
                                        style={{ color: 'white' }}
                                        placeholderTextColor="rgba(255,255,255,0.5)"
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
                                className="bg-white/20 border-white/30"
                                style={{ color: 'white' }}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />

                            {/* Password Field */}
                            <Input
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                icon={Lock}
                                className="bg-white/20 border-white/30"
                                style={{ color: 'white' }}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />

                            {/* Submit Button */}
                            <Button
                                title={isLogin ? "Sign In" : "Create Account"}
                                onPress={handleSubmit}
                                loading={loading}
                                className="mt-4"
                            />
                        </View>
                    </MotiView>

                    {/* Toggle Auth Mode */}
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 600 }}
                        className="flex-row justify-center mt-8 items-center"
                    >
                        <Text className="text-slate-300 font-inter-medium text-base">
                            {isLogin ? "New here? " : "Already a member? "}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setIsLogin(!isLogin);
                                setEmailError('');
                            }}
                            className="py-2"
                        >
                            <Text className="text-brand font-poppins-semibold text-base ml-1">
                                {isLogin ? 'Create Account' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

export default LoginScreen;