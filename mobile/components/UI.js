import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { styled } from 'nativewind';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for merging classes
const cn = (...inputs) => twMerge(clsx(inputs));

export const Button = ({ title, onPress, variant = 'primary', className, loading }) => {
    const baseStyle = "h-14 rounded-2xl items-center justify-center flex-row shadow-sm";
    const variants = {
        primary: "bg-primary",
        secondary: "bg-secondary",
        outline: "border-2 border-primary bg-transparent",
        danger: "bg-red-50",
    };

    const textVariants = {
        primary: "text-secondary font-bold text-lg",
        secondary: "text-white font-bold text-lg",
        outline: "text-primary font-bold text-lg",
        danger: "text-red-500 font-bold text-lg",
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
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
        <View className={cn("bg-white h-14 rounded-2xl border border-gray-100 px-4 flex-row items-center mb-4 shadow-sm", className)}>
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
        <View className={cn("bg-white rounded-3xl p-5 shadow-sm mb-4 border border-gray-50", className)}>
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
                selected ? "bg-primary border-primary" : "bg-gray-50 border-gray-200"
            )}
        >
            <Text className={cn("font-medium", selected ? "text-black" : "text-gray-600")}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};
