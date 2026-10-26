import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderReportHtml, renderReportJson, type ReportData } from '../src/lib/report-renderer.ts';
function fixture(status: string): ReportData {
  return { report: { title: '<script>fixture</script>', type: 'technical' }, generatedAt: new Date('2026-10-26T00:00:00Z'), owner: null, scan: { id: 1, name: 'Controlled fixture', type: 'network', status, progress: status === 'completed' ? 100 : 25 }, asset: null, findings: [], counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } } as unknown as ReportData;
}
for (const status of ['failed', 'stopped', 'pending', 'running']) test(`${status} reports explicitly disclose an incomplete assessment`, () => {
  const data = fixture(status), json = JSON.parse(renderReportJson(data)), html = renderReportHtml(data);
  assert.equal(json.assessmentComplete, false); assert.equal(json.scope.scan.status, status);
  assert.match(json.limitations[0], /did not complete/);
  assert.match(html, /<aside class="assessment-notice">/);
  assert.match(html, /no findings does not mean the target is secure/);
  assert.equal(html.includes('<script>fixture</script>'), false);
});
test('completed reports preserve status without certifying security', () => {
  const data = fixture('completed'), json = JSON.parse(renderReportJson(data)), html = renderReportHtml(data);
  assert.equal(json.assessmentComplete, true); assert.match(json.limitations[0], /does not certify/);
  assert.equal(html.includes('<aside class="assessment-notice">'), false);
});
test('an all-assets export does not imply every assessment completed', () => {
  const data = fixture('completed'); data.scan = null;
  assert.equal(JSON.parse(renderReportJson(data)).assessmentComplete, null);
});
