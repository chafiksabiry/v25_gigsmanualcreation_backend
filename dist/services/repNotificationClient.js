"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyGigDeactivated = notifyGigDeactivated;
exports.triggerMatchingNotificationsForGig = triggerMatchingNotificationsForGig;
const axios_1 = __importDefault(require("axios"));
const DASH_REP_API = String(process.env.DASH_REP_API_URL ||
    process.env.REP_DASH_API_URL ||
    'https://v25dashrepback-production.up.railway.app/api').replace(/\/$/, '');
const MATCHING_API = String(process.env.MATCHING_API_URL ||
    'https://v25matchingbackend-production.up.railway.app/api').replace(/\/$/, '');
function resolveId(value) {
    if (value == null)
        return '';
    if (typeof value === 'object') {
        const o = value;
        if (o._id)
            return resolveId(o._id);
        if (o.$oid)
            return String(o.$oid);
        if (o.id)
            return String(o.id);
    }
    return String(value).trim();
}
async function persistActivityNotification(input) {
    const repId = resolveId(input.repId);
    const notificationKey = String(input.notificationKey || '').trim();
    const kind = String(input.kind || 'general').trim();
    if (!repId || !notificationKey || !kind)
        return null;
    const gigId = resolveId(input.gigId);
    try {
        const res = await axios_1.default.post(`${DASH_REP_API}/notifications/upsert`, {
            notificationKey,
            kind,
            status: input.status || kind,
            title: String(input.title || '').trim(),
            message: String(input.message || '').trim(),
            ...(gigId ? { gigId } : {}),
            ...(input.actionPath ? { actionPath: String(input.actionPath) } : {}),
            read: false,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-agent-id': repId,
            },
            timeout: 8000,
            validateStatus: () => true,
        });
        if (res.status >= 400) {
            console.error('[Gigs RepNotif] upsert failed', kind, res.status);
            return null;
        }
        return res.data?.data || res.data || null;
    }
    catch (err) {
        console.error('[Gigs RepNotif] upsert error', err?.message || err);
        return null;
    }
}
async function listEnrolledRepIds(gigId) {
    const gId = resolveId(gigId);
    if (!gId)
        return [];
    try {
        const res = await axios_1.default.get(`${MATCHING_API}/gig-agents/gig/${encodeURIComponent(gId)}`, {
            timeout: 8000,
            validateStatus: () => true,
        });
        const rows = Array.isArray(res.data)
            ? res.data
            : res.data?.data || res.data?.agents || [];
        return rows
            .filter((r) => {
            const s = String(r?.enrollmentStatus || r?.status || '').toLowerCase();
            return !s || ['enrolled', 'accepted', 'active', 'approved'].includes(s);
        })
            .map((r) => resolveId(r?.agentId?._id || r?.agentId))
            .filter(Boolean);
    }
    catch (err) {
        console.error('[Gigs RepNotif] list enrolled failed', err?.message || err);
        return [];
    }
}
/** Notify enrolled REPs that a project/gig was deactivated. */
async function notifyGigDeactivated(gig) {
    const gId = resolveId(gig._id || gig.id);
    if (!gId)
        return;
    const title = String(gig.title || gig.name || 'Projet');
    const reps = await listEnrolledRepIds(gId);
    await Promise.allSettled(reps.map((repId) => persistActivityNotification({
        repId,
        kind: 'deactivated',
        status: 'deactivated',
        notificationKey: `deact:gig:${gId}`,
        gigId: gId,
        actionPath: `/marketplace?gigId=${encodeURIComponent(gId)}`,
        title: 'Projet désactivé',
        message: `« ${title} » n’est plus actif.`,
    })));
}
const DEFAULT_MATCH_WEIGHTS = {
    skills: 0,
    languages: 0,
    experience: 0,
    region: 0,
    timezone: 0,
    industry: 0,
    activity: 0,
};
/**
 * When a gig becomes active, run matching and notify REPs with score ≥ 50%.
 * Reuses matching backend `POST /matches/gig/:id` → `notifyMatchingOpportunities`.
 */
async function triggerMatchingNotificationsForGig(gigId) {
    const gId = resolveId(gigId);
    if (!gId)
        return;
    let weights = { ...DEFAULT_MATCH_WEIGHTS };
    try {
        const weightsRes = await axios_1.default.get(`${MATCHING_API}/gig-matching-weights/${encodeURIComponent(gId)}`, { timeout: 8000, validateStatus: () => true });
        if (weightsRes.status < 400) {
            const saved = weightsRes.data?.data?.matchingWeights ||
                weightsRes.data?.matchingWeights ||
                weightsRes.data?.data ||
                weightsRes.data;
            if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
                weights = { ...DEFAULT_MATCH_WEIGHTS, ...saved };
            }
        }
    }
    catch (err) {
        console.warn('[Gigs RepNotif] load match weights failed, using defaults', err?.message || err);
    }
    try {
        const res = await axios_1.default.post(`${MATCHING_API}/matches/gig/${encodeURIComponent(gId)}`, { weights }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000,
            validateStatus: () => true,
        });
        if (res.status >= 400) {
            console.error('[Gigs RepNotif] auto-match notify failed', gId, res.status, res.data?.message || res.statusText);
            return;
        }
        const count = Array.isArray(res.data?.preferedmatches)
            ? res.data.preferedmatches.length
            : 0;
        console.log(`[Gigs RepNotif] auto-match ran for gig ${gId} (${count} candidates; ≥50% notified by matching service)`);
    }
    catch (err) {
        console.error('[Gigs RepNotif] auto-match request error', gId, err?.message || err);
    }
}
