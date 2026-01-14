import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for merging classes
const cn = (...inputs) => twMerge(clsx(inputs));

export const Button = ({ title, onPress, variant = 'primary', className, loading }) => {
    const baseStyle = "h-14 px-5 rounded-2xl items-center justify-center flex-row";
    const variants = {
        primary: "bg-brand shadow-lg shadow-brand/30",
        secondary: "bg-surface border border-border",
        accent: "bg-accent shadow-lg shadow-accent/30",
        outline: "bg-transparent border border-border",
        danger: "bg-danger shadow-lg shadow-danger/20",
    };

    const textVariants = {
        primary: "text-white font-bold text-base",
        secondary: "text-primary font-semibold text-base",
        accent: "text-primary font-bold text-base",
        outline: "text-primary font-semibold text-base",
        danger: "text-white font-semibold text-base",
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            disabled={loading}
            className={cn(baseStyle, variants[variant], className)}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#0F172A'} />
            ) : (
                typeof title === 'string' ? <Text className={textVariants[variant]}>{title}</Text> : title
            )}
        </TouchableOpacity>
    );
};

export const Input = ({ value, onChangeText, placeholder, secureTextEntry, icon: Icon, className }) => {
    return (
        <View className={cn("bg-card h-14 rounded-2xl border border-border px-4 flex-row items-center mb-4 shadow-sm shadow-black/5", className)}>
            {Icon && <Icon size={20} color="#556077" className="mr-3" />}
            <TextInput
                className="flex-1 text-base text-primary font-medium h-full"
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#55607780"
                secureTextEntry={secureTextEntry}
            />
        </View>
    );
};

export const Card = ({ children, className }) => {
    return (
        <View className={cn("bg-card rounded-[32px] p-6 mb-4 border border-border shadow-md shadow-black/5", className)}>
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
                selected ? "bg-brand/10 border-brand/20" : "bg-white border-border"
            )}
        >
            <View className={cn("w-1.5 h-1.5 rounded-full mr-2", selected ? "bg-brand" : "bg-muted")} />
            <Text className={cn("text-xs font-semibold", selected ? "text-brand" : "text-muted")}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};
