/**
 * Place de marché des REPS : seules les opérations des clients TaaS y sont proposées. Les opérations d'un client qui a
 * souscrit une offre Téléphonie (forfait avec harx_product=callcenter : Nomad Solo, Accueil / Secrétariat, Full Scope,
 * Call Centre) sont gérées par ses propres agents et ne sont pas ouvertes aux REPS du réseau.
 */
export const TELEPHONY_PRODUCT = 'callcenter';

type GigLike = { companyId?: unknown };

export function companyIdOf(gig: GigLike): string | null {
  const c = gig?.companyId as any;
  if (!c) return null;
  const id = typeof c === 'object' && c._id ? c._id : c;
  const s = String(id);
  return /^[a-f0-9]{24}$/i.test(s) ? s : null;
}

/** Garde les opérations dont l'entreprise n'a pas d'offre Téléphonie. Produit inconnu (null) : l'opération reste proposée. */
export function filterGigsForReps<T extends GigLike>(gigs: T[], productByCompany: Map<string, string | null>): T[] {
  return gigs.filter((gig) => {
    const id = companyIdOf(gig);
    if (!id) return true;
    return productByCompany.get(id) !== TELEPHONY_PRODUCT;
  });
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; product: string | null }>();

/** Produit de chaque entreprise (cache de 60 s : la liste est relue à chaque ouverture de la place de marché). */
export async function productsForCompanies(
  ids: string[],
  resolve: (companyId: string) => Promise<string | null>,
  now = Date.now()
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const todo: string[] = [];
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && now - hit.at < CACHE_TTL_MS) out.set(id, hit.product);
    else todo.push(id);
  }
  const BATCH = 8;
  for (let i = 0; i < todo.length; i += BATCH) {
    await Promise.all(
      todo.slice(i, i + BATCH).map(async (id) => {
        const product = await resolve(id).catch(() => null);
        cache.set(id, { at: now, product });
        out.set(id, product);
      })
    );
  }
  return out;
}
