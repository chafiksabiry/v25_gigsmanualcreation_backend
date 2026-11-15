/* Exécution : npm test (compile vers un dossier temporaire puis node --test). */
import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'crypto';
import {
  assertCompanyHasAiTokens,
  chargeCompanyAiTokens,
  tokenGateErrorResponse,
  signServiceToken,
} from '../src/utils/aiTokenBilling';
import * as billing from '../src/utils/aiTokenBilling';

process.env.JWT_SECRET = 'secret-de-test';
process.env.COMPORCHESTRATOR_API_URL = 'http://orch.test/api';

type Call = { url: string; init?: any };
const calls: Call[] = [];
const reply = (status: number, body: any) => async (url: any, init?: any) => {
  calls.push({ url: String(url), init });
  return { ok: status < 400, status, json: async () => body } as any;
};
const setFetch = (f: any) => { (globalThis as any).fetch = f; };
const usage = { provider: 'anthropic' as const, model: 'm', inputTokens: 100, outputTokens: 50, totalTokens: 150, estimated: false };

test.beforeEach(() => { calls.length = 0; console.info = () => {}; console.warn = () => {}; });

test('plus aucune logique « premier gig gratuit »', () => {
  assert.equal((billing as any).isFirstGigForCompany, undefined);
});

test('jeton de service HS256 valide et court', () => {
  const token = signServiceToken('secret-de-test', { service: 'gigs', companyId: 'c1' });
  const [h, p, sig] = token.split('.');
  assert.equal(JSON.parse(Buffer.from(h, 'base64url').toString()).alg, 'HS256');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  assert.equal(payload.companyId, 'c1');
  assert.ok(payload.exp - payload.iat <= 60);
  assert.equal(sig, crypto.createHmac('sha256', 'secret-de-test').update(`${h}.${p}`).digest('base64url'));
});

test('sans entreprise : 400, aucun appel réseau', async () => {
  setFetch(reply(200, {}));
  const gate = await assertCompanyHasAiTokens('', 1);
  assert.equal(gate.ok, false);
  assert.equal(gate.code, 'company_required');
  assert.equal(tokenGateErrorResponse(gate).status, 400);
  assert.equal(calls.length, 0);
});

test('solde suffisant : vrai solde, jeton de service envoyé', async () => {
  setFetch(reply(200, { success: true, data: { tokens: 200000 } }));
  assert.deepEqual(await assertCompanyHasAiTokens('c1', 1), { ok: true, tokens: 200000 });
  assert.match(calls[0].init.headers.Authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  assert.match(calls[0].url, /tokens-company\/c1\/check\?min=1$/);
  assert.equal(calls.length, 1);
});

test('solde insuffisant (même premier gig) : 402 avec le vrai solde', async () => {
  setFetch(reply(402, { success: false, data: { tokens: 0 }, message: 'Solde de tokens AI insuffisant. Rechargez pour continuer.' }));
  const gate = await assertCompanyHasAiTokens('c1', 1);
  assert.equal(gate.ok, false);
  assert.equal(gate.code, 'insufficient_tokens');
  assert.equal(gate.tokens, 0);
  const r = tokenGateErrorResponse(gate);
  assert.equal(r.status, 402);
  assert.equal((r.body.data as any).tokens, 0);
});

test('solde illisible (401, 500, sans solde, réseau) : 503, jamais gratuit', async () => {
  const failures = [
    reply(401, { error: 'Authentication required' }),
    reply(500, {}),
    reply(200, { success: true, data: {} }),
    async () => { throw new Error('boom'); },
  ];
  for (const f of failures) {
    setFetch(f);
    const gate = await assertCompanyHasAiTokens('c1', 1);
    assert.equal(gate.ok, false);
    assert.equal(gate.code, 'balance_unavailable');
    assert.equal(gate.tokens, undefined);
    assert.equal(tokenGateErrorResponse(gate).status, 503);
  }
});

test('débit réel : montant et solde restant renvoyés', async () => {
  setFetch(reply(200, { charged: true, data: { tokens: 1234 } }));
  const r = await chargeCompanyAiTokens({ companyId: 'c1', usageId: 'u1', usage, tool: 'gig.generate_suggestions', gigId: null });
  assert.deepEqual(r, { billed: true, tokens: 1234, charged: 150 });
  assert.match(calls[0].url, /tokens-company\/charge-usage$/);
  assert.equal(JSON.parse(calls[0].init.body).tokensUsed, 150);
});

test('débit : 402, échec serveur, réseau, non débité, sans entreprise, sans usage', async () => {
  setFetch(reply(402, { data: { tokens: 10 } }));
  assert.deepEqual(await chargeCompanyAiTokens({ companyId: 'c1', usageId: 'u2', usage, tool: 't' }), { billed: false, tokens: 10, charged: 0, reason: 'insufficient_tokens' });
  setFetch(reply(500, {}));
  assert.equal((await chargeCompanyAiTokens({ companyId: 'c1', usageId: 'u3', usage, tool: 't' })).reason, 'charge_failed');
  setFetch(async () => { throw new Error('boom'); });
  assert.equal((await chargeCompanyAiTokens({ companyId: 'c1', usageId: 'u4', usage, tool: 't' })).reason, 'charge_failed');
  setFetch(reply(200, { charged: false }));
  assert.equal((await chargeCompanyAiTokens({ companyId: 'c1', usageId: 'u5', usage, tool: 't' })).charged, 0);
  calls.length = 0;
  setFetch(reply(200, { charged: true }));
  assert.equal((await chargeCompanyAiTokens({ companyId: '', usageId: 'u6', usage, tool: 't' })).reason, 'company_required');
  assert.equal((await chargeCompanyAiTokens({ companyId: 'c1', usageId: 'u7', usage: { ...usage, totalTokens: 0 }, tool: 't' })).reason, 'no_usage');
  assert.equal(calls.length, 0);
});
