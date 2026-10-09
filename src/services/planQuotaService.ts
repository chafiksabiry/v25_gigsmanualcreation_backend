/**
 * Active-gig quota from the subscription plan metadata (ACTIVE GIGS / Active GIGs).
 * The metadata number is used as-is. Missing metadata stays at 1.
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

function metadataNumber(metadata: unknown, prefixes: string[]): number | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const wanted = prefixes.map(norm);
  const entries = Object.entries(metadata as Record<string, unknown>);
  for (const w of wanted) {
    for (const [key, raw] of entries) {
      const nk = norm(key);
      if (nk !== w && !nk.startsWith(w)) continue;
      const match = String(raw ?? '').match(/(\d+(?:[.,]\d+)?)/);
      if (!match) continue;
      const n = Number(match[1].replace(',', '.'));
      if (Number.isFinite(n) && n >= 0) return Math.round(n);
    }
  }
  return null;
}

function resolveMaxGigs(raw: unknown, metadata: unknown): number {
  const fromMeta = metadataNumber(metadata, ['activegigs', 'maxgigs']);
  if (fromMeta != null) return fromMeta;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.round(n);
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
        limits?: { maxGigs?: number; planName?: string; metadata?: Record<string, string> };
        data?: {
          status?: string;
          planId?: { name?: string; maxGigs?: number; metadata?: Record<string, string> } | string;
        };
      };
      if (json?.success && json.data) {
        const plan =
          json.data.planId && typeof json.data.planId === 'object'
            ? json.data.planId
            : {};
        const name = String((plan as any).name || json.limits?.planName || '').toUpperCase() || null;
        const metadata = json.limits?.metadata || (plan as any).metadata;
        const maxGigs = resolveMaxGigs(json.limits?.maxGigs ?? (plan as any).maxGigs, metadata);
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
