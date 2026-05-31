import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Skeleton, shadowStyles, cn } from './UI';
import { MotiView } from 'moti';

const chartColors = ['#6366F1', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444', '#0EA5E9'];

const IssueActivityChart = ({
    data = [],
    loading = false,
    period,
    setPeriod,
    selectedRepo,
    setSelectedRepo,
    repoOptions = []
}) => {
    const metricKey = period === 'weekly' ? 'weekCount' : 'monthCount';
    const filteredData = selectedRepo === 'all'
        ? data
        : data.filter(item => item.repoId === selectedRepo);

    const chartData = filteredData
        .slice()
        .sort((a, b) => b[metricKey] - a[metricKey]);

    if (loading) {
        return (
            <Card className="p-6 mb-8">
                <View className="flex-row items-center justify-between mb-5">
                    <View>
                        <Skeleton width={120} height={16} radius={6} className="mb-2" />
                        <Skeleton width={180} height={10} radius={5} />
                    </View>
                    <View className="flex-row">
                        <Skeleton width={72} height={34} radius={14} className="mr-2" />
                        <Skeleton width={72} height={34} radius={14} />
                    </View>
                </View>
                <Skeleton width="100%" height={260} radius={18} />
            </Card>
        );
    }

    return (
        <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 350 }}
        >
            <Card className="p-6 mb-8">
                <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1 pr-4">
                        <Text className="text-xl font-poppins-bold text-primary mb-1">Activity</Text>
                    </View>
                    <View className="flex-row bg-slate-100 rounded-2xl p-1">
                        <TouchableOpacity
                            onPress={() => setPeriod('weekly')}
                            className={cn('px-4 py-2 rounded-xl', period === 'weekly' ? 'bg-white shadow-sm' : '')}
                        >
                            <Text className={cn('text-xs font-inter-bold', period === 'weekly' ? 'text-primary' : 'text-muted')}>
                                Weekly
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setPeriod('monthly')}
                            className={cn('px-4 py-2 rounded-xl', period === 'monthly' ? 'bg-white shadow-sm' : '')}
                        >
                            <Text className={cn('text-xs font-inter-bold', period === 'monthly' ? 'text-primary' : 'text-muted')}>
                                Monthly
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {repoOptions.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingRight: 6 }}>
                        <TouchableOpacity
                            onPress={() => setSelectedRepo('all')}
                            className={cn('mr-2 px-3 py-2 rounded-full border', selectedRepo === 'all' ? 'bg-brand border-brand' : 'bg-white border-border')}
                        >
                            <Text className={cn('text-xs font-inter-bold', selectedRepo === 'all' ? 'text-white' : 'text-muted')}>
                                All Repos
                            </Text>
                        </TouchableOpacity>
                        {repoOptions.map((repo) => {
                            const repoId = repo.repoId || repo._id || `${repo.owner}/${repo.name}`;
                            const label = `${repo.owner}/${repo.name}`;

                            return (
                                <TouchableOpacity
                                    key={repoId}
                                    onPress={() => setSelectedRepo(repoId)}
                                    className={cn('mr-2 px-3 py-2 rounded-full border', selectedRepo === repoId ? 'bg-brand border-brand' : 'bg-white border-border')}
                                >
                                    <Text className={cn('text-xs font-inter-bold', selectedRepo === repoId ? 'text-white' : 'text-muted')} numberOfLines={1}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {chartData.length === 0 ? (
                    <View className="items-center justify-center py-12 bg-slate-50 rounded-3xl border border-border">
                        <Text className="text-primary font-poppins-semibold text-base mb-1">No activity yet</Text>
                        <Text className="text-muted text-sm font-inter-medium text-center px-8 leading-5">
                            {selectedRepo === 'all'
                                ? 'We will show activity once your repositories start receiving new issues.'
                                : 'This repository has no issue activity for the selected period.'}
                        </Text>
                    </View>
                ) : (
                    <View className="bg-slate-50 rounded-3xl border border-border p-4">
                        {chartData.map((item, index) => {
                            const value = item[metricKey] || 0;
                            const maxValue = Math.max(...chartData.map((entry) => entry[metricKey] || 0), 1);
                            const widthPercent = `${Math.max((value / maxValue) * 100, value > 0 ? 6 : 0)}%`;

                            return (
                                <View key={item.repoId} className="mb-4 last:mb-0">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <Text className="text-xs font-inter-bold text-primary flex-1 pr-3" numberOfLines={1}>
                                            {item.owner}/{item.name}
                                        </Text>
                                        <Text className="text-xs font-poppins-bold text-muted">{value}</Text>
                                    </View>
                                    <View className="h-3 rounded-full bg-white overflow-hidden border border-border">
                                        <View
                                            className="h-full rounded-full"
                                            style={{ width: widthPercent, backgroundColor: chartColors[index % chartColors.length] }}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </Card>
        </MotiView>
    );
};

export default IssueActivityChart;
