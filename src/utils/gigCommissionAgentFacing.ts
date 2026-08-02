/**
 * Agent-facing commission block on `gig.commission` for API responses.
 * Keep aligned with `microfrontends/v25_dash_rep_front/src/utils/gigCommissionDisplay.ts` (buildAgentFacingBlock).
 */
export const AGENT_COMMISSION_MULTIPLIER = 0.7;

export type AgentFacingBlock = {
  sourceMultiplier: number;
  commission_per_call?: number | null;
  transactionCommission?: number | { type?: string; amount?: string | number } | null;
  bonusAmount?: number | null;
  bonus?: number | null;
  baseAmount?: number | null;
};

function round2(n: number): number {
  return Number(Number(n).toFixed(2));
}

function applyAgentCut(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (Number.isNaN(num)) return null;
  return round2(num * AGENT_COMMISSION_MULTIPLIER);
}

/**
 * Adds `agentFacing` to `commission` when missing (idempotent if already set).
 */
export function enrichCommissionWithAgentFacing(
  commission: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (commission == null) return commission;
  if (typeof commission !== 'object') return commission as Record<string, unknown>;
  if (commission.agentFacing && typeof (commission.agentFacing as AgentFacingBlock).sourceMultiplier === 'number') {
    return { ...commission };
  }

  const block: AgentFacingBlock = { sourceMultiplier: AGENT_COMMISSION_MULTIPLIER };

  const per = applyAgentCut(commission.commission_per_call);
  if (per !== null && per > 0) block.commission_per_call = per;

  const rawTx = commission.transactionCommission;
  if (rawTx !== undefined && rawTx !== null) {
    if (typeof rawTx === 'object') {
      const type = String((rawTx as { type?: string }).type || '').toLowerCase();
      const amtRaw = (rawTx as { amount?: unknown }).amount;
      const amt =
        amtRaw !== undefined && amtRaw !== null ? Number(String(amtRaw).replace(/,/g, '')) : NaN;
      if (!Number.isNaN(amt) && amt > 0) {
        if (type === 'percentage' || type === 'percent' || type === '%') {
          block.transactionCommission = {
            type: (rawTx as { type?: string }).type || 'percentage',
            amount: amt,
          };
        } else {
          const cut = applyAgentCut(amt);
          if (cut !== null && cut > 0) block.transactionCommission = cut;
        }
      }
    } else {
      const num = Number(String(rawTx).replace(/,/g, ''));
      if (!Number.isNaN(num) && num > 0) {
        const cut = applyAgentCut(num);
        if (cut !== null && cut > 0) block.transactionCommission = cut;
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
  if (baseCut !== null && baseCut > 0) block.baseAmount = baseCut;

  const hasMore =
    block.commission_per_call != null ||
    block.transactionCommission != null ||
    block.bonusAmount != null ||
    block.baseAmount != null;

  if (!hasMore) return { ...commission };

  return { ...commission, agentFacing: block };
}

/**
 * Mongoose gig doc or plain gig — returns plain object safe for `res.json`.
 */
export function enrichGigForApi(gig: unknown): any {
  if (!gig || typeof gig !== 'object') return gig;
  const g = gig as { toObject?: (opts?: unknown) => Record<string, unknown>; commission?: unknown };
  const o: Record<string, unknown> =
    typeof g.toObject === 'function'
      ? (g.toObject({ virtuals: true }) as Record<string, unknown>)
      : { ...(g as Record<string, unknown>) };

  if (o.commission && typeof o.commission === 'object') {
    o.commission = enrichCommissionWithAgentFacing(o.commission as Record<string, unknown>);
  }
  return o;
}

export function enrichGigsForApi(gigs: unknown[] | null | undefined): any[] {
  if (!Array.isArray(gigs)) return [];
  return gigs.map((g) => enrichGigForApi(g));
}
