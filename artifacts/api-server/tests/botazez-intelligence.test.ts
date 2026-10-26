import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBotazezFeed, createBotazezFeedLoader } from '../src/lib/botazez-intelligence.ts';
const at = '2026-10-26T00:00:00.000Z';
const row = { id: 'CVE-2026-12345', name: 'Example injection', description: 'A test fixture', vendor: 'Example', product: 'Widget', source: 'CISA KEV', date: '2026-10-23', severity: 'CRITICAL' };
const payload = { threats: [row], stats: { cisa_total: 100 }, timestamp: at };
test('uses source-backed records without importing fabricated severity or confidence', () => {
  const feed = normalizeBotazezFeed(payload, at);
  assert.equal(feed.connected, true);
  assert.equal(feed.provider, 'botazez');
  assert.equal(feed.totals.vulnerability, 1);
  assert.equal(feed.records[0].confidence, null);
  assert.equal('severity' in feed.records[0], false);
  assert.equal(feed.records[0].sourceUrl, 'https://www.cve.org/CVERecord?id=CVE-2026-12345');
  assert.deepEqual(feed.availableKinds, ['vulnerability']);
});
test('searches CVEs, products and vendors; genuine no-match stays connected', () => {
  assert.equal(normalizeBotazezFeed(payload, at, 'widget example').records.length, 1);
  const empty = normalizeBotazezFeed(payload, at, 'no matching vendor');
  assert.equal(empty.records.length, 0); assert.equal(empty.connected, true); assert.equal(empty.totals.vulnerability, 0);
});
test('rejects upstream silent failure, invalid data and untrusted identifiers', () => {
  for (const body of [null, {}, { threats: [], stats: {} }, { ...payload, error: 'offline' }, { ...payload, threats: [{ ...row, id: '<script>' }] }]) assert.throws(() => normalizeBotazezFeed(body, at));
});
test('deduplicates records and rejects invalid calendar dates without inventing a date', () => {
  const feed = normalizeBotazezFeed({ ...payload, threats: [{ ...row, date: '2026-02-30' }, row] }, at);
  assert.equal(feed.records.length, 1); assert.equal(feed.records[0].createdAt, null);
});
test('bounds page size and counts matches before pagination', () => {
  const body = { ...payload, threats: Array.from({ length: 55 }, (_, i) => ({ ...row, id: `CVE-2026-${10000 + i}` })) };
  const feed = normalizeBotazezFeed(body, at, '', 1000);
  assert.equal(feed.records.length, 50); assert.equal(feed.totals.vulnerability, 55);
});
test('shares concurrent requests and caches upstream independently of search', async () => {
  let calls = 0, clock = Date.parse(at);
  const loader = createBotazezFeedLoader((async (url, init) => {
    calls++; assert.equal(url, 'https://botazez.com/api/cyber-threats'); assert.equal(init?.redirect, 'error'); assert.deepEqual(init?.headers, { Accept: 'application/json' });
    return Response.json(payload);
  }) as typeof fetch, () => clock);
  await Promise.all([loader(), loader('widget'), loader('different')]); assert.equal(calls, 1);
  await loader(); assert.equal(calls, 1);
  clock += 300_001; await loader(); assert.equal(calls, 2);
});
test('does not turn an HTTP failure or oversized response into a connected empty feed', async () => {
  const failing = createBotazezFeedLoader((async () => new Response('offline', { status: 503 })) as typeof fetch);
  await assert.rejects(failing(), /unavailable/);
  const oversized = createBotazezFeedLoader((async () => new Response('x'.repeat(1_000_001), { headers: { 'content-type': 'application/json' } })) as typeof fetch);
  await assert.rejects(oversized(), /too large/);
});
