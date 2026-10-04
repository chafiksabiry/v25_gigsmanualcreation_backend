"use strict";
/**
 * HARX prepaid AI tokens — normalize provider usage + charge orchestrator wallet.
 * Providers: Anthropic (Claude), OpenAI, Gemini/Vertex. Fallback: ~4 chars ≈ 1 token.
 *
 * Product rule: the company's **first gig** AI draft is free (no balance check, no charge).
 * From the 2nd gig onward, prepaid AI tokens are required.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokensFromText = estimateTokensFromText;
exports.usageFromAnthropic = usageFromAnthropic;
exports.usageFromOpenAI = usageFromOpenAI;
exports.usageFromGemini = usageFromGemini;
exports.fallbackEstimatedUsage = fallbackEstimatedUsage;
exports.resolveUsageOrEstimate = resolveUsageOrEstimate;
exports.isFirstGigForCompany = isFirstGigForCompany;
exports.assertCompanyHasAiTokens = assertCompanyHasAiTokens;
exports.chargeCompanyAiTokens = chargeCompanyAiTokens;
exports.setAiUsageResponseHeaders = setAiUsageResponseHeaders;
const gigModel_1 = require("../models/gigModel");
function estimateTokensFromText(...parts) {
    const chars = parts.reduce((sum, p) => sum + String(p || '').length, 0);
    return Math.max(1, Math.ceil(chars / 4));
}
function usageFromAnthropic(raw, model) {
    const u = raw?.usage || raw;
    const input = Number(u?.input_tokens ?? u?.inputTokens ?? 0);
    const output = Number(u?.output_tokens ?? u?.outputTokens ?? 0);
    if (!Number.isFinite(input + output) || input + output <= 0)
        return null;
    return {
        provider: 'anthropic',
        model: model || undefined,
        inputTokens: Math.max(0, Math.round(input)),
        outputTokens: Math.max(0, Math.round(output)),
        totalTokens: Math.max(0, Math.round(input + output)),
        estimated: false,
    };
}
function usageFromOpenAI(raw, model) {
    const u = raw?.usage || raw;
    const input = Number(u?.prompt_tokens ?? u?.input_tokens ?? u?.promptTokens ?? 0);
    const output = Number(u?.completion_tokens ?? u?.output_tokens ?? u?.completionTokens ?? 0);
    const total = Number(u?.total_tokens ?? input + output);
    if (!Number.isFinite(total) || total <= 0)
        return null;
    return {
        provider: 'openai',
        model: model || raw?.model || undefined,
        inputTokens: Math.max(0, Math.round(input)),
        outputTokens: Math.max(0, Math.round(output)),
        totalTokens: Math.max(0, Math.round(total)),
        estimated: false,
    };
}
function usageFromGemini(raw, model) {
    const u = raw?.usageMetadata || raw?.usage || raw;
    const input = Number(u?.promptTokenCount ?? u?.prompt_token_count ?? u?.inputTokens ?? u?.input_tokens ?? 0);
    const output = Number(u?.candidatesTokenCount ??
        u?.candidates_token_count ??
        u?.outputTokens ??
        u?.output_tokens ??
        0);
    const total = Number(u?.totalTokenCount ?? u?.total_token_count ?? input + output);
    if (!Number.isFinite(total) || total <= 0)
        return null;
    return {
        provider: 'gemini',
        model: model || undefined,
        inputTokens: Math.max(0, Math.round(input)),
        outputTokens: Math.max(0, Math.round(output)),
        totalTokens: Math.max(0, Math.round(total)),
        estimated: false,
    };
}
function fallbackEstimatedUsage(...parts) {
    const total = estimateTokensFromText(...parts);
    return {
        provider: 'estimated',
        inputTokens: 0,
        outputTokens: total,
        totalTokens: total,
        estimated: true,
    };
}
function resolveUsageOrEstimate(usage, ...textParts) {
    if (usage && usage.totalTokens > 0)
        return usage;
    return fallbackEstimatedUsage(...textParts);
}
function getOrchestratorApiBase() {
    const raw = process.env.COMPORCHESTRATOR_API_URL ||
        process.env.ORCHESTRATOR_API_BASE_URL ||
        process.env.VITE_API_BASE_URL ||
        'https://v25comporchestratorback-production.up.railway.app/api';
    return String(raw).replace(/\/$/, '');
}
/** True when the company has zero gigs yet → first-gig AI is free. */
async function isFirstGigForCompany(companyId) {
    const id = String(companyId || '').trim();
    if (!id)
        return true;
    try {
        const count = await gigModel_1.Gig.countDocuments({ companyId: id });
        return count === 0;
    }
    catch (err) {
        console.warn('[aiTokenBilling] first-gig count failed (treating as first):', err);
        return true;
    }
}
async function assertCompanyHasAiTokens(companyId, minRequired = 1, options) {
    const id = String(companyId || '').trim();
    if (!id)
        return { ok: true, tokens: 0 }; // no company → skip gate (legacy callers)
    if (options?.skipIfFirstGig !== false) {
        const firstGig = await isFirstGigForCompany(id);
        if (firstGig) {
            return { ok: true, tokens: 0, firstGigFree: true };
        }
    }
    try {
        const base = getOrchestratorApiBase();
        const res = await fetch(`${base}/tokens-company/${encodeURIComponent(id)}/check?min=${Math.max(1, minRequired)}`);
        const json = await res.json().catch(() => ({}));
        const tokens = typeof json?.data?.tokens === 'number' ? json.data.tokens : 0;
        if (!res.ok || json?.success === false) {
            return {
                ok: false,
                tokens,
                message: json?.message || 'Solde de tokens AI insuffisant. Rechargez pour continuer.',
            };
        }
        return { ok: true, tokens };
    }
    catch (err) {
        console.warn('[aiTokenBilling] assert check failed (allowing request):', err);
        return { ok: true, tokens: 0 };
    }
}
async function chargeCompanyAiTokens(opts) {
    const id = String(opts.companyId || '').trim();
    if (!id)
        return { billed: false };
    if (opts.skipCharge) {
        return { billed: false, firstGigFree: true };
    }
    const tokensUsed = Math.max(0, Math.round(opts.usage.totalTokens || 0));
    if (tokensUsed <= 0)
        return { billed: false };
    try {
        const base = getOrchestratorApiBase();
        const gigId = String(opts.gigId || opts.meta?.gigId || '').trim() || undefined;
        const res = await fetch(`${base}/tokens-company/charge-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyId: id,
                usageId: opts.usageId,
                tokensUsed,
                tool: opts.tool,
                gigId: gigId || undefined,
                meta: {
                    ...(opts.meta || {}),
                    provider: opts.usage.provider,
                    model: opts.usage.model || null,
                    inputTokens: opts.usage.inputTokens,
                    outputTokens: opts.usage.outputTokens,
                    estimated: opts.usage.estimated,
                    ...(gigId ? { gigId } : {}),
                },
            }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 402) {
            console.warn('[aiTokenBilling] charge 402 insufficient_tokens', id, tokensUsed);
            return { billed: false, tokens: json?.data?.tokens };
        }
        if (!res.ok) {
            console.warn('[aiTokenBilling] charge failed', res.status, json);
            return { billed: false };
        }
        return {
            billed: Boolean(json?.charged),
            tokens: typeof json?.data?.tokens === 'number' ? json.data.tokens : undefined,
        };
    }
    catch (err) {
        console.warn('[aiTokenBilling] charge error:', err);
        return { billed: false };
    }
}
function setAiUsageResponseHeaders(res, usage, billed) {
    res.setHeader('X-Ai-Tokens-Used', String(usage.totalTokens));
    res.setHeader('X-Ai-Tokens-Charged', billed ? '1' : '0');
    res.setHeader('X-Ai-Provider', usage.provider);
    if (usage.model)
        res.setHeader('X-Ai-Model', usage.model);
    res.setHeader('X-Ai-Tokens-Estimated', usage.estimated ? '1' : '0');
}
