import React, { useContext, useState } from 'react';
import { View, Text, Alert, Image, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, Card } from '../components/UI';
import { Mail, Lock, Zap } from 'lucide-react-native';

const LoginScreen = ({ navigation }) => {
    const { login, signup } = useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
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
        <SafeAreaView className="flex-1 bg-background px-6 justify-center">
            <StatusBar barStyle="light-content" />
            <View className="items-center mb-10">
                <View className="w-20 h-20 bg-brand rounded-[28px] items-center justify-center mb-4 shadow-2xl shadow-brand/20">
                    <Zap size={40} color="black" fill="black" />
                </View>
                <Text className="text-3xl font-extrabold text-white">Issue Notify</Text>
                <Text className="text-muted mt-1 text-base">Track GitHub issues like a pro</Text>
            </View>

            <Card className="px-6 py-8">
                {!isLogin && (
                    <Input
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        // Use User icon if available, but Mail is fine for now as placeholder
                        icon={Mail}
                    />
                )}
                <Input
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    icon={Mail}
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
                    className="mt-4"
                />
            </Card>

            <View className="flex-row justify-center mt-8">
                <Text className="text-muted font-medium">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                    <Text className="text-brand font-bold ml-1">
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default LoginScreen;
