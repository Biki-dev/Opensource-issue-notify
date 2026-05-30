const normalizeExpoPushTokens = (value) => {
    if (Array.isArray(value)) {
        return Array.from(new Set(
            value
                .map(token => `${token}`.trim())
                .filter(Boolean)
        ));
    }

    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }

    return [];
};

const mergeExpoPushTokens = (...values) => {
    const merged = [];

    for (const value of values) {
        for (const token of normalizeExpoPushTokens(value)) {
            if (!merged.includes(token)) {
                merged.push(token);
            }
        }
    }

    return merged;
};

const removeExpoPushToken = (tokens, tokenToRemove) => {
    const normalizedTokens = normalizeExpoPushTokens(tokens);
    const normalizedTokenToRemove = `${tokenToRemove || ''}`.trim();

    if (!normalizedTokenToRemove) {
        return normalizedTokens;
    }

    return normalizedTokens.filter(token => token !== normalizedTokenToRemove);
};

module.exports = {
    normalizeExpoPushTokens,
    mergeExpoPushTokens,
    removeExpoPushToken
};