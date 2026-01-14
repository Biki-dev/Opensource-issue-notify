import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { styled } from 'nativewind';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for merging classes
const cn = (...inputs) => twMerge(clsx(inputs));

export const Button = ({ title, onPress, variant = 'primary', className, loading }) => {
    const baseStyle = "h-14 px-5 rounded-2xl items-center justify-center flex-row";
    const variants = {
        primary: "bg-brand",
        secondary: "bg-card border border-border",
        accent: "bg-accent",
        outline: "bg-transparent border border-border",
        danger: "bg-red-500/10 border border-red-500/50",
    };

    const textVariants = {
        primary: "text-black font-bold text-base",
        secondary: "text-white font-semibold text-base",
        accent: "text-white font-bold text-base",
        outline: "text-white font-semibold text-base",
        danger: "text-red-500 font-semibold text-base",
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            disabled={loading}
            className={cn(baseStyle, variants[variant], className)}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? '#000' : '#fff'} />
            ) : (
                typeof title === 'string' ? <Text className={textVariants[variant]}>{title}</Text> : title
            )}
        </TouchableOpacity>
    );
};

export const Input = ({ value, onChangeText, placeholder, secureTextEntry, icon: Icon, className }) => {
    return (
        <View className={cn("bg-card h-14 rounded-2xl border border-border px-4 flex-row items-center mb-4", className)}>
            {Icon && <Icon size={20} color="#A1A1AA" className="mr-3" />}
            <TextInput
                className="flex-1 text-base text-white font-medium h-full"
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#71717A"
                secureTextEntry={secureTextEntry}
            />
        </View>
    );
};

export const Card = ({ children, className }) => {
    return (
        <View className={cn("bg-card rounded-[32px] p-6 mb-4 border border-border", className)}>
            {children}
        </View>
    );
};

export const LabelChip = ({ label, selected, onPress }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={cn(
                "px-3 py-1.5 rounded-full mr-2 mb-2 border flex-row items-center",
                selected ? "bg-brand/10 border-brand/50" : "bg-accent/10 border-accent/30"
            )}
        >
            <View className={cn("w-1.5 h-1.5 rounded-full mr-2", selected ? "bg-brand" : "bg-accent")} />
            <Text className={cn("text-xs font-medium", selected ? "text-brand" : "text-accent")}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};
