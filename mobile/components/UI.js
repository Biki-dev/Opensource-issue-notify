import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image, Platform } from 'react-native';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MotiView } from 'moti';
import { ChevronRight, Github, Bell, Star, GitFork } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Helper for merging classes
export const cn = (...inputs) => twMerge(clsx(inputs));

// Shadow Styles Helper
export const shadowStyles = {
    light: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    medium: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 5,
    },
    strong: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
        elevation: 10,
    },
    fab: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    }
};

export const AnimatedMascot = ({ source, style, className }) => {
    return (
        <MotiView
            from={{ opacity: 0, scale: 0.85, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{
                type: 'timing',
                duration: 400,
            }}
            className={className}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
            >
                <Image source={source} style={style} resizeMode="contain" />
            </TouchableOpacity>
        </MotiView>
    );
};

export const Button = ({ title, onPress, onLongPress, delayLongPress, variant = 'primary', className, loading, icon: Icon, size = 'default' }) => {
    const baseStyle = "rounded-2xl items-center justify-center flex-row";

    // Size variants
    const sizes = {
        default: "h-16 px-6",
        sm: "h-12 px-4",
        lg: "h-16 px-8"
    };

    const variants = {
        primary: "bg-brand",
        secondary: "bg-backgroundLight border border-border",
        accent: "bg-accent",
        outline: "bg-transparent border border-border",
        danger: "bg-danger",
        ghost: "bg-transparent"
    };

    const textVariants = {
        primary: "text-white font-poppins-semibold text-lg",
        secondary: "text-primary font-inter-medium text-base",
        accent: "text-white font-poppins-semibold text-lg",
        outline: "text-brand font-inter-medium text-base",
        danger: "text-white font-poppins-semibold text-lg",
        ghost: "text-brand font-inter-medium text-base"
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
    };

    return (
        <MotiView
            animate={({ pressed }) => ({
                scale: pressed ? 0.98 : 1,
            })}
            transition={{ type: 'timing', duration: 100 }}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                onLongPress={onLongPress}
                delayLongPress={delayLongPress}
                disabled={loading}
                className={cn(baseStyle, sizes[size], variants[variant], className)}
                style={variant === 'primary' || variant === 'accent' ? shadowStyles.fab : {}}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'secondary' || variant === 'outline' ? '#6366F1' : '#fff'} />
                ) : (
                    <>
                        {Icon && <Icon size={24} color={variant === 'secondary' || variant === 'outline' ? '#94A3B8' : '#fff'} className="mr-3" fill="none" />}
                        {typeof title === 'string' ? <Text className={textVariants[variant]}>{title}</Text> : title}
                    </>
                )}
            </TouchableOpacity>
        </MotiView>
    );
};

export const Input = ({ value, onChangeText, placeholder, secureTextEntry, icon: Icon, className, error, ...props }) => {
    return (
        <View className="mb-4">
            <View className={cn(
                "bg-white h-16 rounded-2xl border border-border px-5 flex-row items-center shadow-sm",
                error ? "border-danger" : "focus:border-brand",
                className
            )} style={shadowStyles.light}>
                {Icon && <Icon size={24} color="#94A3B8" className="mr-4" />}
                <TextInput
                    className="flex-1 text-base text-primary font-inter-medium h-full"
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={secureTextEntry}
                    {...props}
                />
            </View>
            {error && (
                <MotiView from={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 20 }}>
                    <Text className="text-danger text-xs mt-1 ml-1 font-inter-medium">{error}</Text>
                </MotiView>
            )}
        </View>
    );
};

export const Card = ({ children, className, containerStyle }) => {
    return (
        <View
            className={cn("bg-card rounded-3xl p-6 mb-4 border border-border", className)}
            style={[shadowStyles.light, containerStyle]}
        >
            {children}
        </View>
    );
};

export const LabelChip = ({ label, selected, onPress }) => {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
    };

    return (
        <MotiView
            animate={{
                scale: selected ? 1.05 : 1,
                borderColor: selected ? '#6366F1' : '#E2E8F0'
            }}
        >
            <TouchableOpacity
                onPress={handlePress}
                className={cn(
                    "px-3 py-1 rounded-full mr-2 mb-2 border flex-row items-center self-start",
                    selected ? "bg-brand/10" : "bg-white"
                )}
            >
                <View className={cn("w-1.5 h-1.5 rounded-full mr-1.5", selected ? "bg-brand" : "bg-slate-300")} />
                <Text className={cn("text-[11px] font-inter-bold", selected ? "text-brand" : "text-slate-500")}>
                    {label}
                </Text>
            </TouchableOpacity>
        </MotiView>
    );
};

// New Components

export const Skeleton = ({ width, height, radius = 12, className, style }) => {
    return (
        <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 0.8 }}
            transition={{
                loop: true,
                type: 'timing',
                duration: 800,
                repeatReverse: true,
            }}
            style={[{ width, height, borderRadius: radius }, style]}
            className={cn("bg-slate-200", className)}
        />
    );
};

export const SkeletonCard = ({ type = 'default' }) => {
    if (type === 'compact') {
        return (
            <View className="mb-4 p-4 bg-white rounded-3xl border border-border" style={{ width: '48%' }}>
                <View className="items-center mb-3">
                    <Skeleton width={48} height={48} radius={12} className="mb-2" />
                    <Skeleton width="60%" height={10} radius={4} className="mb-1.5" />
                    <Skeleton width="80%" height={14} radius={4} />
                </View>
                <View className="flex-row justify-center mb-3">
                    <Skeleton width={40} height={18} radius={20} className="mr-1" />
                    <Skeleton width={40} height={18} radius={20} />
                </View>
                <View className="flex-row justify-between pt-3 border-t border-border/50">
                    <Skeleton width="30%" height={24} radius={8} />
                    <Skeleton width="30%" height={24} radius={8} />
                </View>
            </View>
        );
    }

    return (
        <Card className="mb-6 p-6">
            <View className="flex-row items-center mb-4">
                <Skeleton width={40} height={40} radius={20} className="mr-3" />
                <View className="flex-1">
                    <Skeleton width="40%" height={10} radius={4} className="mb-1.5" />
                    <Skeleton width="60%" height={14} radius={4} />
                </View>
            </View>
            <Skeleton width="100%" height={20} radius={4} className="mb-2" />
            <Skeleton width="100%" height={20} radius={4} className="mb-4" />
            <View className="flex-row mb-6">
                <Skeleton width={60} height={24} radius={20} className="mr-2" />
                <Skeleton width={60} height={24} radius={20} />
            </View>
            <Skeleton width="100%" height={56} radius={16} />
        </Card>
    );
};

export const ListSkeleton = ({ count = 3, type = 'default', containerStyle }) => {
    return (
        <View style={containerStyle} className={type === 'compact' ? "flex-row flex-wrap justify-between" : ""}>
            {[...Array(count)].map((_, i) => (
                <MotiView
                    key={i}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: i * 100 }}
                    style={type === 'compact' ? { width: '100%', flexDirection: 'row', gap: '4%', flexWrap: 'wrap' } : {}}
                >
                    {type === 'compact' ? (
                        <>
                            <SkeletonCard type="compact" />
                            <SkeletonCard type="compact" />
                        </>
                    ) : (
                        <SkeletonCard type={type} />
                    )}
                </MotiView>
            ))}
        </View>
    );
};

export const Badge = ({ count, className }) => {
    if (!count) return null;
    return (
        <View className={cn("bg-danger rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center absolute", className)}>
            <Text className="text-white text-[10px] font-bold">{count > 99 ? '99+' : count}</Text>
        </View>
    );
};

export const FAB = ({ icon: Icon, onPress }) => {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
    };

    return (
        <MotiView
            from={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-8 right-6"
        >
            <TouchableOpacity
                onPress={handlePress}
                className="w-16 h-16 bg-brand rounded-full items-center justify-center shadow-lg"
                style={shadowStyles.fab}
            >
                <Icon size={32} color="white" fill="none" />
            </TouchableOpacity>
        </MotiView>
    );
};

export const SectionHeader = ({ title, icon: Icon, action }) => (
    <View className="flex-row items-center justify-between mb-4 mt-2 px-1">
        <View className="flex-row items-center">
            {Icon && <Icon size={20} color="#6366F1" className="mr-2" fill="none" />}
            <Text className="text-xl font-poppins-semibold text-primary">{title}</Text>
        </View>
        {action}
    </View>
);

export const SwitchRow = ({ label, value, onValueChange, icon: Icon }) => {
    const handleToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(!value);
    };

    return (
        <TouchableOpacity
            onPress={handleToggle}
            className="flex-row items-center justify-between py-4 border-b border-border/50"
        >
            <View className="flex-row items-center">
                {Icon && <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-4">
                    <Icon size={20} color="#6366F1" fill="none" />
                </View>}
                <Text className="text-base font-inter-medium text-primary">{label}</Text>
            </View>

            <MotiView
                animate={{
                    backgroundColor: value ? '#6366F1' : '#E2E8F0',
                }}
                className="w-12 h-7 rounded-full justify-center px-1"
            >
                <MotiView
                    animate={{
                        translateX: value ? 20 : 0,
                    }}
                    className="w-5 h-5 rounded-full bg-white shadow-sm"
                />
            </MotiView>
        </TouchableOpacity>
    );
};
