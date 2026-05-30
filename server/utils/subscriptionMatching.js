const normalizeStringList = (values) => {
    if (!Array.isArray(values)) return [];

    return Array.from(new Set(
        values
            .map(value => `${value}`.trim())
            .filter(Boolean)
    ));
};

const toLowercaseList = (values) => normalizeStringList(values).map(value => value.toLowerCase());

const issueMatchesSubscription = (issue, subscription) => {
    const labels = toLowercaseList(subscription.labels);
    const keywords = toLowercaseList(subscription.keywords);

    const issueLabels = (issue.labels || []).map(label => `${label.name || ''}`.trim().toLowerCase()).filter(Boolean);
    const issueText = `${issue.title || ''} ${issue.body || ''}`.toLowerCase();

    const labelMatches = labels.length === 0 || issueLabels.some(label => labels.includes(label));
    const keywordMatches = keywords.length === 0 || keywords.some(keyword => issueText.includes(keyword));

    return labelMatches && keywordMatches;
};

module.exports = {
    normalizeStringList,
    toLowercaseList,
    issueMatchesSubscription
};
