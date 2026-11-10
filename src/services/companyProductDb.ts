import mongoose from 'mongoose';

/**
 * Produit du forfait actif de chaque entreprise (`harx_product` : `callcenter`, …), lu directement dans la base partagée
 * (collections `subscriptions` et `subscriptionplans` de l'orchestrateur). Le jeton de service entre ce service et l'orchestrateur
 * est refusé en recette (« invalid signature » : secrets différents), ce qui laissait toutes les opérations visibles.
 * Pas d'abonnement actif : null (client TaaS).
 */
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

function metaObject(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {};
  if (metadata instanceof Map) return Object.fromEntries(metadata.entries());
  return typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
}

export function productOfMetadata(metadata: unknown): string | null {
  const entry = Object.entries(metaObject(metadata)).find(([k]) => k.trim().toLowerCase() === 'harx_product');
  return entry ? String(entry[1] ?? '').trim().toLowerCase() || null : null;
}

type SubRow = { companyId?: unknown; planId?: unknown; createdAt?: unknown };
type PlanRow = { _id?: unknown; metadata?: unknown };

/** Assemble abonnements et forfaits (fonction pure) : l'abonnement actif le plus récent de chaque entreprise donne son produit. */
export function productsFromRows(ids: string[], subs: SubRow[], plans: PlanRow[]): Map<string, string | null> {
  const planById = new Map(plans.map((p) => [String(p._id), p]));
  const newest = new Map<string, SubRow>();
  for (const s of subs) {
    const id = String(s.companyId ?? '');
    const prev = newest.get(id);
    if (!prev || new Date(String(s.createdAt ?? 0)).getTime() >= new Date(String(prev.createdAt ?? 0)).getTime()) newest.set(id, s);
  }
  const out = new Map<string, string | null>();
  for (const id of ids) {
    const sub = newest.get(id);
    out.set(id, sub ? productOfMetadata(planById.get(String(sub.planId))?.metadata) : null);
  }
  return out;
}

export async function productsFromDb(ids: string[]): Promise<Map<string, string | null>> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('database not ready');
  const subs = (await db
    .collection('subscriptions')
    .find({ companyId: { $in: ids }, status: { $in: ACTIVE_STATUSES } })
    .project({ companyId: 1, planId: 1, createdAt: 1 })
    .toArray()) as SubRow[];
  const planIds = Array.from(new Set(subs.map((s) => String(s.planId ?? '')).filter(Boolean))).map((id) => new mongoose.Types.ObjectId(id));
  const plans = planIds.length
    ? ((await db.collection('subscriptionplans').find({ _id: { $in: planIds } }).project({ metadata: 1 }).toArray()) as PlanRow[])
    : [];
  return productsFromRows(ids, subs, plans);
}
