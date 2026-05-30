import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Skeleton, shadowStyles, cn } from './UI';
import { MotiView } from 'moti';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const chartColors = ['#6366F1', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444', '#0EA5E9'];

const CustomTooltip = ({ active, payload, label, period }) => {
    if (!active || !payload?.length) return null;

    const value = payload[0]?.value || 0;

    return (
        <View className="bg-white px-3 py-2 rounded-xl border border-border shadow-sm" style={shadowStyles.light}>
            <Text className="text-primary font-inter-bold text-xs mb-1">{label}</Text>
            <Text className="text-muted text-xs font-inter-medium">
                {period === 'weekly' ? 'Weekly' : 'Monthly'} issues: <Text className="text-brand font-inter-bold">{value}</Text>
            </Text>
        </View>
    );
};

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
        .sort((a, b) => b[metricKey] - a[metricKey])
        .map((item, index) => ({
            ...item,
            label: `${item.owner}/${item.name}`,
            value: item[metricKey],
            fill: chartColors[index % chartColors.length]
        }));

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
                        <Text className="text-xl font-poppins-bold text-primary mb-1">Issue Activity</Text>
                        <Text className="text-xs text-muted font-inter-medium leading-5">
                            Compare how active your subscribed repos have been over the last 7 or 30 days.
                        </Text>
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
                    <View style={{ height: 280 }} className="bg-slate-50 rounded-3xl border border-border overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 20, left: -12, bottom: 44 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#E2E8F0' }}
                                    interval={0}
                                    angle={-25}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={(props) => <CustomTooltip {...props} period={period} />} />
                                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={28} fill="#6366F1" />
                            </BarChart>
                        </ResponsiveContainer>
                    </View>
                )}
            </Card>
        </MotiView>
    );
};

export default IssueActivityChart;
