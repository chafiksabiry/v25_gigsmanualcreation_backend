"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_COMMISSION_MULTIPLIER = void 0;
exports.enrichCommissionWithAgentFacing = enrichCommissionWithAgentFacing;
exports.enrichGigForApi = enrichGigForApi;
exports.enrichGigsForApi = enrichGigsForApi;
/**
 * Agent-facing commission block on `gig.commission` for API responses.
 * Keep aligned with `microfrontends/v25_dash_rep_front/src/utils/gigCommissionDisplay.ts` (buildAgentFacingBlock).
 */
exports.AGENT_COMMISSION_MULTIPLIER = 0.7;
function round2(n) {
    return Number(Number(n).toFixed(2));
}
function applyAgentCut(val) {
    if (val === undefined || val === null || val === '')
        return null;
    const num = parseFloat(String(val).replace(/,/g, ''));
    if (Number.isNaN(num))
        return null;
    return round2(num * exports.AGENT_COMMISSION_MULTIPLIER);
}
/**
 * Adds `agentFacing` to `commission` when missing (idempotent if already set).
 */
function enrichCommissionWithAgentFacing(commission) {
    if (commission == null)
        return commission;
    if (typeof commission !== 'object')
        return commission;
    if (commission.agentFacing && typeof commission.agentFacing.sourceMultiplier === 'number') {
        return { ...commission };
    }
    const block = { sourceMultiplier: exports.AGENT_COMMISSION_MULTIPLIER };
    const per = applyAgentCut(commission.commission_per_call);
    if (per !== null && per > 0)
        block.commission_per_call = per;
    const rawTx = commission.transactionCommission;
    if (rawTx !== undefined && rawTx !== null) {
        if (typeof rawTx === 'object') {
            const type = String(rawTx.type || '').toLowerCase();
            const amtRaw = rawTx.amount;
            const amt = amtRaw !== undefined && amtRaw !== null ? Number(String(amtRaw).replace(/,/g, '')) : NaN;
            if (!Number.isNaN(amt) && amt > 0) {
                if (type === 'percentage' || type === 'percent' || type === '%') {
                    block.transactionCommission = {
                        type: rawTx.type || 'percentage',
                        amount: amt,
                    };
                }
                else {
                    const cut = applyAgentCut(amt);
                    if (cut !== null && cut > 0)
                        block.transactionCommission = cut;
                }
            }
        }
        else {
            const num = Number(String(rawTx).replace(/,/g, ''));
            if (!Number.isNaN(num) && num > 0) {
                const cut = applyAgentCut(num);
                if (cut !== null && cut > 0)
                    block.transactionCommission = cut;
            }
        }
    }
    const bonusRaw = commission.bonusAmount ?? commission.bonus;
    const bonusCut = applyAgentCut(bonusRaw);
    if (bonusCut !== null && bonusCut > 0) {
        block.bonusAmount = bonusCut;
        block.bonus = bonusCut;
    }
    const baseCut = applyAgentCut(commission.baseAmount);
    if (baseCut !== null && baseCut > 0)
        block.baseAmount = baseCut;
    const hasMore = block.commission_per_call != null ||
        block.transactionCommission != null ||
        block.bonusAmount != null ||
        block.baseAmount != null;
    if (!hasMore)
        return { ...commission };
    return { ...commission, agentFacing: block };
}
/**
 * Mongoose gig doc or plain gig — returns plain object safe for `res.json`.
 */
function enrichGigForApi(gig) {
    if (!gig || typeof gig !== 'object')
        return gig;
    const g = gig;
    const o = typeof g.toObject === 'function'
        ? g.toObject({ virtuals: true })
        : { ...g };
    if (o.commission && typeof o.commission === 'object') {
        o.commission = enrichCommissionWithAgentFacing(o.commission);
    }
    return o;
}
function enrichGigsForApi(gigs) {
    if (!Array.isArray(gigs))
        return [];
    return gigs.map((g) => enrichGigForApi(g));
}
