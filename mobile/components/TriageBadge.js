import React from 'react';
import { View, Text } from 'react-native';

const SEVERITY_CONFIG = {
    critical: {
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#DC2626',
        emoji: '🚨',
        label: 'Critical'
    },
    high: {
        bg: '#FFF7ED',
        border: '#FED7AA',
        text: '#EA580C',
        emoji: '⚠️',
        label: 'High'
    },
    medium: {
        bg: '#FEFCE8',
        border: '#FEF08A',
        text: '#CA8A04',
        emoji: '📋',
        label: 'Medium'
    },
    low: {
        bg: '#F0FDF4',
        border: '#BBF7D0',
        text: '#16A34A',
        emoji: '💡',
        label: 'Low'
    }
};

const TYPE_EMOJI = {
    bug: '🐛',
    feature: '✨',
    question: '❓',
    documentation: '📚',
    performance: '⚡',
    security: '🔐',
    duplicate: '📑',
    other: '📌'
};

export const SeverityBadge = ({ severity }) => {
    if (!severity) return null;
    const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            borderWidth: 1,
            backgroundColor: config.bg,
            borderColor: config.border,
            alignSelf: 'flex-start'
        }}>
            <Text style={{ fontSize: 10 }}>{config.emoji}</Text>
            <Text style={{
                fontSize: 10,
                fontWeight: '700',
                color: config.text,
                marginLeft: 3,
                textTransform: 'uppercase',
                letterSpacing: 0.5
            }}>
                {config.label}
            </Text>
        </View>
    );
};

export const TypeBadge = ({ type }) => {
    if (!type) return null;
    const emoji = TYPE_EMOJI[type] || '📌';
    const label = type.charAt(0).toUpperCase() + type.slice(1);

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            backgroundColor: '#EEF2FF',
            borderWidth: 1,
            borderColor: '#C7D2FE',
            alignSelf: 'flex-start',
            marginLeft: 6
        }}>
            <Text style={{ fontSize: 10 }}>{emoji}</Text>
            <Text style={{
                fontSize: 10,
                fontWeight: '700',
                color: '#4F46E5',
                marginLeft: 3
            }}>
                {label}
            </Text>
        </View>
    );
};

export const TriageCard = ({ triage }) => {
    if (!triage?.severity) return null;

    const config = SEVERITY_CONFIG[triage.severity] || SEVERITY_CONFIG.medium;

    return (
        <View style={{
            backgroundColor: config.bg,
            borderWidth: 1,
            borderColor: config.border,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12
        }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <SeverityBadge severity={triage.severity} />
                <TypeBadge type={triage.type} />
                {triage.estimatedEffort && triage.estimatedEffort !== 'unknown' && (
                    <View style={{
                        marginLeft: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 20,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E2E8F0'
                    }}>
                        <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>
                            🕐 {triage.estimatedEffort}
                        </Text>
                    </View>
                )}
            </View>

            {/* AI Summary */}
            {triage.summary && (
                <Text style={{
                    fontSize: 13,
                    color: '#0F172A',
                    fontWeight: '500',
                    lineHeight: 18,
                    marginBottom: 4
                }}>
                    {triage.summary}
                </Text>
            )}

            {/* Reasoning */}
            {triage.reasoning && !triage.isFallback && (
                <Text style={{
                    fontSize: 11,
                    color: '#64748B',
                    fontStyle: 'italic',
                    lineHeight: 16
                }}>
                    {triage.reasoning}
                </Text>
            )}

            {/* AI label */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 8
            }}>
                <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '600' }}>
                    {triage.isFallback ? '⚡ AUTO-CLASSIFIED' : '🤖 AI TRIAGE'}
                </Text>
            </View>
        </View>
    );
};
