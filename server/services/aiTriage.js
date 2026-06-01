const axios = require('axios');

const AI_PROVIDER = process.env.AI_PROVIDER;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';

/**
 * Analyze a GitHub issue using AI (OpenRouter or NVIDIA)
 * @param {object} issue - GitHub issue object
 * @returns {Promise<object>} Triage result
 */
const triageIssue = async (issue) => {
    if (AI_PROVIDER === 'nvidia') {
        return triageIssueNVIDIA(issue);
    } else {
        return triageIssueOpenRouter(issue);
    }
};

/**
 * Triage using NVIDIA API
 */
const triageIssueNVIDIA = async (issue) => {
    if (!NVIDIA_API_KEY) {
        console.warn('⚠️  NVIDIA_API_KEY not set, skipping triage');
        return null;
    }

    const prompt = buildTriagePrompt(issue);

    try {
        console.log(`🤖 Triaging issue #${issue.number} via NVIDIA: ${issue.title}`);

        const response = await axios.post(
            'https://integrate.api.nvidia.com/v1/chat/completions',
            {
                model: NVIDIA_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a senior software engineer triaging GitHub issues. 
You analyze issues and respond ONLY with a valid JSON object. 
No markdown, no explanation, just raw JSON.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 15000
            }
        );

        const content = response.data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from NVIDIA');
        }

        const triage = parseTriageResponse(content);
        console.log(`   ✅ Triage complete: ${triage.severity} | ${triage.type}`);
        return triage;

    } catch (error) {
        console.error(`   ❌ Triage failed for #${issue.number}:`, error.message);
        return getFallbackTriage(issue);
    }
};

/**
 * Triage using OpenRouter API
 */
const triageIssueOpenRouter = async (issue) => {
    if (!OPENROUTER_API_KEY) {
        console.warn('⚠️  OPENROUTER_API_KEY not set, skipping triage');
        return null;
    }

    const prompt = buildTriagePrompt(issue);

    try {
        console.log(`🤖 Triaging issue #${issue.number} via OpenRouter: ${issue.title}`);

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a senior software engineer triaging GitHub issues. 
You analyze issues and respond ONLY with a valid JSON object. 
No markdown, no explanation, just raw JSON.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://issuewatch.app',
                    'X-Title': 'IssueWatch'
                },
                timeout: 15000
            }
        );

        const content = response.data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenRouter');
        }

        const triage = parseTriageResponse(content);
        console.log(`   ✅ Triage complete: ${triage.severity} | ${triage.type}`);
        return triage;

    } catch (error) {
        console.error(`   ❌ Triage failed for #${issue.number}:`, error.message);
        return getFallbackTriage(issue);
    }
};

/**
 * Build the triage prompt
 */
const buildTriagePrompt = (issue) => {
    const body = (issue.body || '').substring(0, 1500); // Cap to save tokens
    const labels = (issue.labels || []).map(l => l.name).join(', ');

    return `Analyze this GitHub issue and respond with ONLY a JSON object.

ISSUE:
Title: ${issue.title}
Labels: ${labels || 'none'}
Body: ${body || 'No description provided'}

Respond with this exact JSON structure:
{
  "severity": "critical" | "high" | "medium" | "low",
  "type": "bug" | "feature" | "question" | "documentation" | "performance" | "security" | "duplicate" | "other",
  "summary": "One sentence (max 120 chars) explaining what this issue is about",
  "reasoning": "One sentence explaining your severity assessment",
  "actionable": true | false,
  "estimatedEffort": "quick-fix" | "medium" | "large" | "unknown"
}

Severity guide:
- critical: app crashes, data loss, security vulnerability, blocks all users
- high: major feature broken, affects many users, no workaround
- medium: feature partially broken, workaround exists, affects some users  
- low: minor issue, cosmetic, enhancement, rare edge case`;
};

/**
 * Parse and validate the AI response
 */
const parseTriageResponse = (content) => {
    // Strip any markdown code fences if present
    const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    const parsed = JSON.parse(cleaned);

    // Validate and sanitize fields
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    const validTypes = ['bug', 'feature', 'question', 'documentation', 'performance', 'security', 'duplicate', 'other'];
    const validEfforts = ['quick-fix', 'medium', 'large', 'unknown'];

    return {
        severity: validSeverities.includes(parsed.severity) ? parsed.severity : 'medium',
        type: validTypes.includes(parsed.type) ? parsed.type : 'other',
        summary: typeof parsed.summary === 'string'
            ? parsed.summary.substring(0, 150)
            : 'No summary available',
        reasoning: typeof parsed.reasoning === 'string'
            ? parsed.reasoning.substring(0, 200)
            : '',
        actionable: typeof parsed.actionable === 'boolean' ? parsed.actionable : true,
        estimatedEffort: validEfforts.includes(parsed.estimatedEffort) ? parsed.estimatedEffort : 'unknown',
        model: AI_PROVIDER === 'nvidia' ? NVIDIA_MODEL : OPENROUTER_MODEL,
        analyzedAt: new Date()
    };
};

/**
 * Fallback triage when AI fails — rule-based heuristics
 */
const getFallbackTriage = (issue) => {
    const title = (issue.title || '').toLowerCase();
    const labels = (issue.labels || []).map(l => l.name.toLowerCase());

    let severity = 'medium';
    let type = 'other';

    // Severity heuristics
    if (labels.includes('critical') || labels.includes('urgent') ||
        title.includes('crash') || title.includes('security') ||
        title.includes('data loss') || title.includes('vulnerability')) {
        severity = 'critical';
    } else if (labels.includes('bug') || title.includes('broken') ||
        title.includes('not working') || title.includes('error')) {
        severity = 'high';
    } else if (labels.includes('enhancement') || labels.includes('feature') ||
        title.includes('add') || title.includes('support') ||
        title.includes('implement')) {
        severity = 'low';
        type = 'feature';
    }

    // Type heuristics
    if (labels.includes('bug') || title.includes('bug') || title.includes('fix')) {
        type = 'bug';
    } else if (labels.includes('question') || title.includes('how') ||
        title.includes('why') || title.includes('?')) {
        type = 'question';
    } else if (labels.includes('documentation') || labels.includes('docs')) {
        type = 'documentation';
    } else if (labels.includes('security')) {
        type = 'security';
        severity = 'critical';
    }

    return {
        severity,
        type,
        summary: `${issue.title}`.substring(0, 150),
        reasoning: 'Auto-classified based on labels and title (AI unavailable)',
        actionable: true,
        estimatedEffort: 'unknown',
        model: 'fallback-heuristic',
        analyzedAt: new Date(),
        isFallback: true
    };
};

/**
 * Batch triage multiple issues (with rate limiting)
 */
const triageIssueBatch = async (issues, delayMs = 200) => {
    const results = [];

    for (const issue of issues) {
        const result = await triageIssue(issue);
        results.push({ issueNumber: issue.number, triage: result });

        // Small delay to be respectful to rate limits
        if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return results;
};

/**
 * Get provider information for logging/debugging
 */
const getProviderInfo = () => {
    if (AI_PROVIDER === 'nvidia') {
        return {
            provider: 'NVIDIA',
            model: NVIDIA_MODEL,
            endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
            configured: !!NVIDIA_API_KEY
        };
    } else {
        return {
            provider: 'OpenRouter',
            model: OPENROUTER_MODEL,
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            configured: !!OPENROUTER_API_KEY
        };
    }
};

module.exports = { triageIssue, triageIssueBatch, getFallbackTriage, getProviderInfo };
