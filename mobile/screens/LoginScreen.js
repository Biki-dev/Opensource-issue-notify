import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, Card, shadowStyles } from '../components/UI';
import { Mail, Lock, Zap, User, ArrowRight } from 'lucide-react-native';
import { MotiView, MotiText } from 'moti';
import { StatusBar } from 'expo-status-bar';

const LoginScreen = ({ navigation }) => {
    const { login, signup } = useContext(AuthContext);
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
            Alert.alert('Error', 'Something went wrong. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background px-6">
            <StatusBar style="dark" />
            <View className="flex-1 justify-center">
                <View className="items-center mb-12">
                    <MotiView
                        from={{ opacity: 0, scale: 0.5, rotate: '0deg' }}
                        animate={{ opacity: 1, scale: 1, rotate: '0deg' }}
                        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                        className="w-24 h-24 bg-brand rounded-[32px] items-center justify-center mb-6 shadow-2xl"
                        style={shadowStyles.strong}
                    >
                        <Zap size={48} color="white" fill="white" />
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 200 }}
                    >
                        <Text className="text-4xl font-poppins-bold text-primary text-center">Issue Notify</Text>
                        <Text className="text-muted mt-2 text-lg font-inter-medium text-center px-4">
                            The ultimate dashboard for GitHub maintainers
                        </Text>
                    </MotiView>
                </View>

                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 400, type: 'spring', damping: 20 }}
                >
                    <Card className="p-8">
                        {!isLogin && (
                            <MotiView
                                from={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 80 }}
                                transition={{ type: 'timing', duration: 300 }}
                            >
                                <Input
                                    placeholder="Full Name"
                                    value={name}
                                    onChangeText={setName}
                                    icon={User}
                                />
                            </MotiView>
                        )}

                        <Input
                            placeholder="Email Address"
                            value={email}
                            onChangeText={validateEmail}
                            icon={Mail}
                            error={emailError}
                        />

                        <Input
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            icon={Lock}
                        />

                        <Button
                            title={isLogin ? "Sign In" : "Create Account"}
                            onPress={handleSubmit}
                            loading={loading}
                            icon={isLogin ? ArrowRight : Zap}
                            className="mt-4"
                        />
                    </Card>
                </MotiView>

                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 600 }}
                    className="flex-row justify-center mt-8 items-center"
                >
                    <Text className="text-muted font-inter-medium text-base">
                        {isLogin ? "New to Issue Notify? " : "Already a member? "}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setIsLogin(!isLogin)}
                        className="py-2"
                    >
                        <Text className="text-brand font-poppins-semibold text-base ml-1">
                            {isLogin ? 'Create Account' : 'Sign In'}
                        </Text>
                    </TouchableOpacity>
                </MotiView>
            </View>
        </SafeAreaView>
    );
};

export default LoginScreen;
