/**
 * backfillSetupSteps.ts
 *
 * One-shot maintenance script that walks every gig in the database and
 * computes its activation checklist (`setupSteps`) from real backend
 * state. Mirrors the per-step logic of `GigSetupChecklist.tsx` so the
 * UI doesn't have to re-probe every step on every dashboard mount.
 *
 *   • telephony        — `${PHONE_API}/phone-numbers` filtered by gigId
 *   • uploadContacts   — gig has at least one Lead in this DB
 *   • callScript       — `${KB_API}/rag/scripts?gigId=`
 *   • knowledgeBase    — `${KB_API}/documents?gigId=`
 *   • repOnboarding    — `${TRAINING_API}/training_journeys/trainer/companyId/:id?gigId=`
 *   • sessionPlanning  — `${MATCHING_API}/time-slots?gigId=`
 *   • gigActivation    — `gig.status === 'active'`
 *
 * Usage
 *   npm run backfill:setup-steps              # write to DB
 *   npm run backfill:setup-steps -- --dry-run # report only, no writes
 *   npm run backfill:setup-steps -- --gigId=<id>  # single gig
 *   npm run backfill:setup-steps -- --force   # rewrite even if no drift
 *
 * Behaviour:
 *   • Gigs without a `setupSteps` field at all are ALWAYS initialised
 *     (e.g. gigs created before the schema change like the ones with
 *     `status: 'to_activate'`).
 *   • Gigs already carrying a `setupSteps` doc are only updated if at
 *     least one flag drifted vs the live probe (unless `--force`).
 *
 * The script is idempotent: re-running it simply re-syncs each flag
 * with the current state of the side services. Safe to schedule via
 * cron if you don't want to wire the per-step PATCH calls in the
 * frontend immediately.
 */

import mongoose from 'mongoose';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import { Gig } from '../models/gigModel';
import { Lead } from '../models/leadModel';

dotenv.config();

// ──────────────────────────────────────────────────────────────────────
//  Config — env-driven so the same script works against staging/prod.
//  Falls back to the same Railway production URLs used by the
//  `GigSetupChecklist` widget to keep behaviour consistent.
// ──────────────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://harx:gcZ62rl8hoME@38.242.208.242:27018/V25_CompanySearchWizard';

const PHONE_API =
  process.env.PHONE_API_URL ||
  'https://v25gigsmanualcreationbackend-production.up.railway.app/api';

const KB_API_RAW =
  process.env.KNOWLEDGEBASE_API_URL ||
  'https://v25knowledgebasebackend-production.up.railway.app';
const KB_API = KB_API_RAW.endsWith('/api') ? KB_API_RAW : `${KB_API_RAW}/api`;

const TRAINING_API_RAW =
  process.env.TRAINING_API_URL ||
  'https://v25platformtrainingbackend-production.up.railway.app';
const TRAINING_API = TRAINING_API_RAW.endsWith('/api')
  ? TRAINING_API_RAW
  : `${TRAINING_API_RAW}/api`;

const MATCHING_API =
  process.env.MATCHING_API_URL ||
  'https://v25matchingbackend-production.up.railway.app/api';

const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS) || 15_000;

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const GIG_ID_FILTER = args.find((a) => a.startsWith('--gigId='))?.split('=')[1];

// ──────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────

const http = axios.create({ timeout: HTTP_TIMEOUT_MS });

/** Wraps an async probe so a 4xx/5xx/network error never crashes the
 *  whole script — we just treat the step as "not done" and continue. */
async function safeBool(fn: () => Promise<boolean>): Promise<boolean> {
  try {
    return await fn();
  } catch (err) {
    const axErr = err as AxiosError;
    const code = axErr?.response?.status;
    console.warn(
      `   ⚠️  probe failed (${axErr.code || 'err'}${code ? ` ${code}` : ''}): ${
        axErr.message
      }`
    );
    return false;
  }
}

/** Fetch the phone-numbers directory ONCE and return a `gigId → boolean` map.
 *  `GigSetupChecklist` does the same: one request, then per-gig hash lookup. */
async function fetchPhoneNumbersByGig(): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  try {
    const res = await http.get(`${PHONE_API}/phone-numbers`);
    const list = Array.isArray((res.data as any)?.data)
      ? (res.data as any).data
      : Array.isArray(res.data)
      ? res.data
      : [];
    for (const n of list) {
      if (n?.gigId) out[String(n.gigId)] = true;
    }
  } catch (err) {
    console.warn('⚠️  could not fetch /phone-numbers directory:', (err as Error).message);
  }
  return out;
}

type StepFlags = {
  telephony: boolean;
  uploadContacts: boolean;
  callScript: boolean;
  knowledgeBase: boolean;
  repOnboarding: boolean;
  sessionPlanning: boolean;
  gigActivation: boolean;
};

async function probeGig(
  gigId: string,
  companyId: string,
  userId: string | undefined,
  isActive: boolean,
  phoneByGig: Record<string, boolean>
): Promise<StepFlags> {
  // If the gig is already active we trust the system: every checklist
  // tile is considered done. Matches `GigSetupChecklist.probeGigSetup`.
  if (isActive) {
    return {
      telephony: true,
      uploadContacts: true,
      callScript: true,
      knowledgeBase: true,
      repOnboarding: true,
      sessionPlanning: true,
      gigActivation: true,
    };
  }

  // Local DB probe — leads live in the same Mongo as gigs, so we hit
  // the collection directly instead of going through HTTP.
  const leadCount = await Lead.countDocuments({ gigId }).catch(() => 0);
  const contactsDone = leadCount > 0;

  const [scriptDone, kbDone, repOnboardingDone, sessionsDone] = await Promise.all([
    safeBool(async () => {
      const r = await http.get(`${KB_API}/rag/scripts`, { params: { gigId } });
      const list = Array.isArray((r.data as any)?.data)
        ? (r.data as any).data
        : Array.isArray(r.data)
        ? r.data
        : [];
      return list.length > 0;
    }),
    safeBool(async () => {
      const params: Record<string, string> = { gigId };
      if (userId) params.userId = userId;
      const r = await http.get(`${KB_API}/documents`, { params });
      const j = r.data as any;
      const list = Array.isArray(j?.documents)
        ? j.documents
        : Array.isArray(j?.data)
        ? j.data
        : Array.isArray(j)
        ? j
        : [];
      return list.length > 0;
    }),
    safeBool(async () => {
      const r = await http.get(
        `${TRAINING_API}/training_journeys/trainer/companyId/${companyId}`,
        { params: { gigId } }
      );
      const j = r.data as any;
      const list = Array.isArray(j?.data?.journeys)
        ? j.data.journeys
        : Array.isArray(j?.data)
        ? j.data
        : Array.isArray(j?.journeys)
        ? j.journeys
        : Array.isArray(j)
        ? j
        : [];
      return list.length > 0;
    }),
    safeBool(async () => {
      const r = await http.get(`${MATCHING_API}/time-slots`, { params: { gigId } });
      const list = Array.isArray((r.data as any)?.data)
        ? (r.data as any).data
        : Array.isArray(r.data)
        ? r.data
        : [];
      return list.length > 0;
    }),
  ]);

  return {
    telephony: !!phoneByGig[gigId],
    uploadContacts: contactsDone,
    callScript: scriptDone,
    knowledgeBase: kbDone,
    repOnboarding: repOnboardingDone,
    sessionPlanning: sessionsDone,
    gigActivation: false,
  };
}

function progressLabel(flags: StepFlags): string {
  const total = Object.keys(flags).length;
  const done = Object.values(flags).filter(Boolean).length;
  return `${done}/${total}`;
}

function formatFlags(flags: StepFlags): string {
  const symbol = (b: boolean) => (b ? '✓' : '·');
  return [
    `tel:${symbol(flags.telephony)}`,
    `lead:${symbol(flags.uploadContacts)}`,
    `script:${symbol(flags.callScript)}`,
    `kb:${symbol(flags.knowledgeBase)}`,
    `train:${symbol(flags.repOnboarding)}`,
    `plan:${symbol(flags.sessionPlanning)}`,
    `act:${symbol(flags.gigActivation)}`,
  ].join(' ');
}

// ──────────────────────────────────────────────────────────────────────
//  Main
// ──────────────────────────────────────────────────────────────────────

async function main() {
  const tStart = Date.now();
  console.log('───────────────────────────────────────────────');
  console.log(' HARX • backfill gig.setupSteps');
  console.log('───────────────────────────────────────────────');
  console.log(' MONGO_URI    :', MONGO_URI.replace(/:[^:@/]+@/, ':***@'));
  console.log(' PHONE_API    :', PHONE_API);
  console.log(' KB_API       :', KB_API);
  console.log(' TRAINING_API :', TRAINING_API);
  console.log(' MATCHING_API :', MATCHING_API);
  console.log(' DRY_RUN      :', DRY_RUN);
  if (GIG_ID_FILTER) console.log(' GIG_ID       :', GIG_ID_FILTER);
  console.log('───────────────────────────────────────────────');

  await mongoose.connect(MONGO_URI);
  console.log('✓ connected to MongoDB');

  const filter = GIG_ID_FILTER ? { _id: GIG_ID_FILTER } : {};
  const gigs = await Gig.find(filter).select('_id title status companyId userId setupSteps').lean();
  console.log(`✓ loaded ${gigs.length} gig(s) to process\n`);

  const phoneByGig = await fetchPhoneNumbersByGig();
  console.log(`✓ phone-numbers directory: ${Object.keys(phoneByGig).length} mapped gig(s)\n`);

  let initialised = 0;
  let updated = 0;
  let unchanged = 0;
  let activated = 0;
  let completed = 0;

  for (let i = 0; i < gigs.length; i += 1) {
    const gig = gigs[i] as any;
    const isActive = gig.status === 'active';
    const tag = `[${i + 1}/${gigs.length}] ${gig.title || gig._id}`;
    // The schema was added later, so a lot of legacy docs don't carry
    // the field at all yet. We always want to materialise it.
    const hadField =
      gig.setupSteps != null &&
      typeof gig.setupSteps === 'object' &&
      Object.keys(gig.setupSteps).length > 0;

    try {
      const flags = await probeGig(
        String(gig._id),
        String(gig.companyId || ''),
        gig.userId ? String(gig.userId) : undefined,
        isActive,
        phoneByGig
      );

      const before = (gig.setupSteps || {}) as Record<string, boolean | undefined>;
      const drift = (Object.keys(flags) as Array<keyof StepFlags>).filter(
        (k) => Boolean(before[k]) !== flags[k]
      );
      const allDone = Object.values(flags).every(Boolean);

      console.log(
        ` ${tag}\n   status=${gig.status}  hadField=${hadField ? 'yes' : 'NO '}  progress=${progressLabel(flags)}  ${formatFlags(flags)}`
      );

      // Decide whether to write. Three reasons to write:
      //   1. The field doesn't exist yet → always materialise it.
      //   2. At least one flag drifted vs the live probe.
      //   3. --force was passed.
      const shouldWrite = !hadField || drift.length > 0 || FORCE;

      if (drift.length > 0) {
        console.log(
          `   Δ ${drift.map((k) => `${k}:${Boolean(before[k]) ? '✓' : '·'}→${flags[k] ? '✓' : '·'}`).join(' ')}`
        );
      }

      if (!shouldWrite) {
        console.log('   = already up-to-date');
        unchanged += 1;
        continue;
      }

      const reason = !hadField
        ? 'init  '
        : drift.length > 0
        ? 'update'
        : 'force ';
      console.log(`   → ${reason}  ${allDone ? '(all steps completed)' : '(incomplete)'}`);

      if (!DRY_RUN) {
        await Gig.findByIdAndUpdate(gig._id, { $set: { setupSteps: flags } });
      }

      if (!hadField) initialised += 1;
      else updated += 1;
      if (flags.gigActivation && !before?.gigActivation) activated += 1;
      if (allDone) completed += 1;
    } catch (err) {
      console.error(` ${tag}\n   ✗ error:`, (err as Error).message);
    }
  }

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log('\n───────────────────────────────────────────────');
  console.log(' SUMMARY', DRY_RUN ? '(dry-run, no DB writes)' : '');
  console.log('───────────────────────────────────────────────');
  console.log(' processed   :', gigs.length);
  console.log(' initialised :', initialised, '(legacy gigs without setupSteps)');
  console.log(' updated     :', updated,     '(field existed, flags drifted)');
  console.log(' unchanged   :', unchanged);
  console.log(' activated ✓ :', activated);
  console.log(' fully done  :', completed);
  console.log(' elapsed     :', `${elapsed}s`);

  await mongoose.disconnect();
  console.log('✓ disconnected, exiting.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
