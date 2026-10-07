"use strict";
/**
 * Resolves the company's active-gig quota from the company orchestrator
 * subscription (Stripe-synced `maxGigs`). Falls back by plan name when
 * metadata is missing so STARTER stays capped at 1.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCompanyGigQuota = resolveCompanyGigQuota;
const PLAN_FALLBACKS = {
    STARTER: 1,
    RUNNER: 10,
    GROWTH: 10,
    SCALER: 30,
    SCALE: 30,
};
const NEXT_PLAN = {
    STARTER: 'RUNNER',
    RUNNER: 'SCALER',
    GROWTH: 'SCALER',
};
function orchestratorBaseUrl() {
    return (process.env.COMPORCHESTRATOR_BACK_URL ||
        'https://v25comporchestratorback-production.up.railway.app');
}
async function resolveCompanyGigQuota(companyId) {
    const base = orchestratorBaseUrl();
    try {
        const res = await fetch(`${base}/api/subscriptions/current/${companyId}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
            const json = (await res.json());
            if (json?.success && json.data) {
                const plan = json.data.planId || {};
                const name = String(plan.name || '').toUpperCase() || null;
                let maxGigs = Number(plan.maxGigs);
                if (!Number.isFinite(maxGigs) || maxGigs < 0) {
                    maxGigs = (name ? PLAN_FALLBACKS[name] : undefined) ?? 1;
                }
                return {
                    maxGigs: Math.round(maxGigs),
                    planName: name,
                    nextPlanHint: (name && NEXT_PLAN[name]) || null,
                };
            }
        }
        else {
            console.warn(`[planQuota] subscription API ${res.status} for company ${companyId}`);
        }
    }
    catch (err) {
        console.warn('[planQuota] Failed to resolve company gig quota:', err);
    }
    // Restrictive default when subscription is unknown.
    return { maxGigs: 1, planName: null, nextPlanHint: 'RUNNER' };
}
