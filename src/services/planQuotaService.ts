/**
 * Resolves the company's active-gig quota from the company orchestrator
 * subscription (Stripe-synced `maxGigs`). Falls back by plan name when
 * metadata is missing so STARTER stays capped at 1.
 */

export type ActiveGigSummary = {
  _id: string;
  title: string;
};

export type PlanQuota = {
  maxGigs: number;
  planName: string | null;
  nextPlanHint: string | null;
};

const PLAN_CEILINGS: Record<string, number> = {
  STARTER: 1,
  RUNNER: 10,
  GROWTH: 10,
  SCALER: 30,
  SCALE: 30,
};

const NEXT_PLAN: Record<string, string> = {
  STARTER: 'RUNNER',
  RUNNER: 'SCALER',
  GROWTH: 'SCALER',
};

function orchestratorBaseUrl(): string {
  const raw =
    process.env.COMPORCHESTRATOR_BACK_URL ||
    'https://v25comporchestratorback-production.up.railway.app';
  return String(raw).replace(/\/$/, '').replace(/\/api$/i, '');
}

function resolveMaxGigs(planName: string | null, raw: unknown): number {
  const ceiling = planName ? PLAN_CEILINGS[planName] : undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return ceiling ?? 1;
  }
  const rounded = Math.round(n);
  if (ceiling != null) {
    // Never exceed known plan ceiling (STARTER must stay at 1).
    return Math.min(rounded, ceiling);
  }
  return rounded;
}

export async function resolveCompanyGigQuota(companyId: string): Promise<PlanQuota> {
  const base = orchestratorBaseUrl();
  const url = `${base}/api/subscriptions/current/${companyId}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          status?: string;
          planId?: { name?: string; maxGigs?: number } | string;
        };
      };
      if (json?.success && json.data) {
        const plan =
          json.data.planId && typeof json.data.planId === 'object'
            ? json.data.planId
            : {};
        const name = String((plan as any).name || '').toUpperCase() || null;
        const maxGigs = resolveMaxGigs(name, (plan as any).maxGigs);
        console.log(
          `[planQuota] company=${companyId} plan=${name || '?'} maxGigs=${maxGigs}`
        );
        return {
          maxGigs,
          planName: name,
          nextPlanHint: (name && NEXT_PLAN[name]) || null,
        };
      }
    } else {
      console.warn(
        `[planQuota] subscription API ${res.status} for company ${companyId} url=${url}`
      );
    }
  } catch (err) {
    console.warn('[planQuota] Failed to resolve company gig quota:', err);
  }
  // Restrictive default when subscription is unknown.
  return { maxGigs: 1, planName: 'STARTER', nextPlanHint: 'RUNNER' };
}
