import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { styled } from 'nativewind';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for merging classes
const cn = (...inputs) => twMerge(clsx(inputs));

export const Button = ({ title, onPress, variant = 'primary', className, loading }) => {
    const baseStyle = "h-14 px-5 rounded-3xl items-center justify-center flex-row shadow-lg shadow-yellow-500/25";
    const variants = {
        primary: "bg-primary",
        secondary: "bg-black",
        outline: "bg-white border border-gray-200",
        danger: "bg-red-50 border border-red-200",
    };

    const textVariants = {
        primary: "text-black font-semibold text-base",
        secondary: "text-white font-semibold text-base",
        outline: "text-gray-900 font-semibold text-base",
        danger: "text-red-600 font-semibold text-base",
    };

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            disabled={loading}
            className={cn(baseStyle, variants[variant], className)}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'secondary' ? '#fff' : '#000'} />
            ) : (
                <Text className={textVariants[variant]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

export const Input = ({ value, onChangeText, placeholder, secureTextEntry, icon: Icon, className }) => {
    return (
        <View className={cn("bg-white/95 h-14 rounded-2xl border border-gray-200 px-4 flex-row items-center mb-4 shadow-sm shadow-black/5", className)}>
            {Icon && <Icon size={20} color="#9CA3AF" className="mr-3" />}
            <TextInput
                className="flex-1 text-base text-gray-900 font-medium h-full"
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={secureTextEntry}
            />
        </View>
    );
};

export const Card = ({ children, className }) => {
    return (
        <View className={cn("bg-white/95 rounded-3xl p-5 shadow-md shadow-black/5 mb-4 border border-gray-100", className)}>
            {children}
        </View>
    );
};

export const LabelChip = ({ label, selected, onPress }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={cn(
                "px-4 py-2 rounded-full mr-2 mb-2 border",
                selected ? "bg-yellow-50 border-yellow-400" : "bg-gray-50 border-gray-200"
            )}
        >
            <Text className={cn("font-medium", selected ? "text-gray-900" : "text-gray-600")}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};
