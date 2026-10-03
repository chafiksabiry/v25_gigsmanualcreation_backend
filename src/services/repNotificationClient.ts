import axios from 'axios';

const DASH_REP_API = String(
  process.env.DASH_REP_API_URL ||
    process.env.REP_DASH_API_URL ||
    'https://v25dashrepback-production.up.railway.app/api'
).replace(/\/$/, '');

const MATCHING_API = String(
  process.env.MATCHING_API_URL ||
    'https://v25matchingbackend-production.up.railway.app/api'
).replace(/\/$/, '');

function resolveId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    const o = value as { _id?: unknown; $oid?: unknown; id?: unknown };
    if (o._id) return resolveId(o._id);
    if (o.$oid) return String(o.$oid);
    if (o.id) return String(o.id);
  }
  return String(value).trim();
}

async function persistActivityNotification(input: {
  repId: unknown;
  kind: string;
  notificationKey: string;
  title: string;
  message: string;
  gigId?: unknown;
  actionPath?: string;
  status?: string;
}): Promise<unknown> {
  const repId = resolveId(input.repId);
  const notificationKey = String(input.notificationKey || '').trim();
  const kind = String(input.kind || 'general').trim();
  if (!repId || !notificationKey || !kind) return null;

  const gigId = resolveId(input.gigId);
  try {
    const res = await axios.post(
      `${DASH_REP_API}/notifications/upsert`,
      {
        notificationKey,
        kind,
        status: input.status || kind,
        title: String(input.title || '').trim(),
        message: String(input.message || '').trim(),
        ...(gigId ? { gigId } : {}),
        ...(input.actionPath ? { actionPath: String(input.actionPath) } : {}),
        read: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': repId,
        },
        timeout: 8000,
        validateStatus: () => true,
      }
    );
    if (res.status >= 400) {
      console.error('[Gigs RepNotif] upsert failed', kind, res.status);
      return null;
    }
    return res.data?.data || res.data || null;
  } catch (err: any) {
    console.error('[Gigs RepNotif] upsert error', err?.message || err);
    return null;
  }
}

async function listEnrolledRepIds(gigId: unknown): Promise<string[]> {
  const gId = resolveId(gigId);
  if (!gId) return [];
  try {
    const res = await axios.get(`${MATCHING_API}/gig-agents/gig/${encodeURIComponent(gId)}`, {
      timeout: 8000,
      validateStatus: () => true,
    });
    const rows = Array.isArray(res.data)
      ? res.data
      : res.data?.data || res.data?.agents || [];
    return (rows as any[])
      .filter((r) => {
        const s = String(r?.enrollmentStatus || r?.status || '').toLowerCase();
        return !s || ['enrolled', 'accepted', 'active', 'approved'].includes(s);
      })
      .map((r) => resolveId(r?.agentId?._id || r?.agentId))
      .filter(Boolean);
  } catch (err: any) {
    console.error('[Gigs RepNotif] list enrolled failed', err?.message || err);
    return [];
  }
}

/** Notify enrolled REPs that a project/gig was deactivated. */
export async function notifyGigDeactivated(gig: {
  _id?: unknown;
  id?: unknown;
  title?: unknown;
  name?: unknown;
}): Promise<void> {
  const gId = resolveId(gig._id || gig.id);
  if (!gId) return;
  const title = String(gig.title || gig.name || 'Projet');
  const reps = await listEnrolledRepIds(gId);
  await Promise.allSettled(
    reps.map((repId) =>
      persistActivityNotification({
        repId,
        kind: 'deactivated',
        status: 'deactivated',
        notificationKey: `deact:gig:${gId}`,
        gigId: gId,
        actionPath: `/marketplace?gigId=${encodeURIComponent(gId)}`,
        title: 'Projet désactivé',
        message: `« ${title} » n’est plus actif.`,
      })
    )
  );
}
