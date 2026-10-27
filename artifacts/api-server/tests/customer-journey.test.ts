import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../src/app";
import {
  client,
  db,
  initializeFixtureDatabase,
  findingsTable,
} from "./fixtures/customer-db";
let server: Server,
  base: string,
  tokenA: string,
  tokenB: string,
  assetId: number,
  scanId: number,
  findingId: number,
  reportId: number;
async function request(
  path: string,
  token = "",
  method = "GET",
  body?: unknown,
) {
  return fetch(base + path, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
before(async () => {
  await initializeFixtureDatabase();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const a = server.address();
  assert(a && typeof a !== "string");
  base = `http://127.0.0.1:${a.port}/api`;
});
after(async () => {
  server?.closeAllConnections();
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  await client.close();
});
test("two customers can register and sign in with their own persisted accounts", async () => {
  for (const [email, name] of [
    ["a@fixture.example", "Customer A"],
    ["b@fixture.example", "Customer B"],
  ]) {
    const register = await request("/auth/register", "", "POST", {
      email,
      name,
      orgName: name,
      password: "Fixture-passphrase-2026",
    });
    assert.equal(register.status, 201, await register.clone().text());
    const login = await request("/auth/login", "", "POST", {
      email,
      password: "Fixture-passphrase-2026",
    });
    assert.equal(login.status, 200);
    const { token, user } = await login.json();
    assert.equal(user.email, email);
    if (name === "Customer A") tokenA = token;
    else tokenB = token;
  }
  const wrong = await request("/auth/login", "", "POST", {
    email: "a@fixture.example",
    password: "Wrong-password",
  });
  assert.equal(wrong.status, 401);
});
test("a target requires permission and is readable only by its owner", async () => {
  const body = {
    name: "Owned fixture",
    type: "web_app",
    target: "fixture.example",
    authorizationConfirmed: false,
  };
  assert.equal((await request("/assets", tokenA, "POST", body)).status, 400);
  const response = await request("/assets", tokenA, "POST", {
    ...body,
    authorizationConfirmed: true,
  });
  assert.equal(response.status, 201);
  assetId = (await response.json()).id;
  assert.equal((await request(`/assets/${assetId}`, tokenA)).status, 200);
  assert.equal((await request(`/assets/${assetId}`, tokenB)).status, 404);
  assert.deepEqual(await (await request("/assets", tokenB)).json(), []);
  assert.equal(
    (await request(`/assets/${assetId}`, tokenB, "PATCH", { name: "Hijack" }))
      .status,
    404,
  );
  assert.equal(
    (await request(`/assets/${assetId}`, tokenB, "DELETE")).status,
    404,
  );
});
test("a customer cannot create or view a scan against another customer target", async () => {
  const body = { name: "Fixture scan", type: "web_app", assetId };
  assert.equal((await request("/scans", tokenB, "POST", body)).status, 400);
  const response = await request("/scans", tokenA, "POST", body);
  assert.equal(response.status, 201);
  scanId = (await response.json()).id;
  assert.equal((await request(`/scans/${scanId}`, tokenB)).status, 404);
  assert.equal(
    (await request(`/scans/${scanId}/stop`, tokenB, "POST", {})).status,
    404,
  );
});
test("persisted fixture findings cannot be read or changed by the other customer", async () => {
  // Seeded evidence, not a claim that a real scanner ran or found a weakness.
  const me = await (await request("/auth/me", tokenA)).json();
  const [finding] = await db
    .insert(findingsTable)
    .values({
      userId: me.id,
      title: "Synthetic fixture finding",
      severity: "medium",
      category: "web",
      assetId,
      scanId,
      mitreId: "T1190",
      mitreTactic: "initial-access",
      mitreTechnique: "Exploit Public-Facing Application",
      description: "Controlled test evidence.",
      remediation: "Fixture remediation.",
      evidence: "fixture-marker-only",
    })
    .returning();
  findingId = finding.id;
  assert.equal((await request(`/findings/${findingId}`, tokenA)).status, 200);
  assert.equal((await request(`/findings/${findingId}`, tokenB)).status, 404);
  assert.equal(
    (
      await request(`/findings/${findingId}`, tokenB, "PATCH", {
        status: "resolved",
      })
    ).status,
    404,
  );
  assert.deepEqual(await (await request("/findings", tokenB)).json(), []);
});
test("report downloads contain owned evidence and disclose an incomplete scan", async () => {
  const body = {
    title: "Fixture report",
    type: "technical",
    format: "json",
    scanId,
    assetId,
  };
  assert.equal((await request("/reports", tokenB, "POST", body)).status, 400);
  const response = await request("/reports", tokenA, "POST", body);
  assert.equal(response.status, 201);
  reportId = (await response.json()).id;
  const download = await request(`/reports/${reportId}/download`, tokenA);
  assert.equal(download.status, 200);
  const report = await download.json();
  assert.equal(report.assessmentComplete, false);
  assert.equal(report.findings[0].title, "Synthetic fixture finding");
  assert.match(report.limitations[0], /did not complete/);
  assert.equal(
    (await request(`/reports/${reportId}/download`, tokenB)).status,
    404,
  );
  assert.equal((await request(`/reports/${reportId}/download`)).status, 401);
});

test("controlled scanner output reaches saved findings and a completed report through the API", async () => {
  const created = await request("/scans", tokenA, "POST", {
    name: "Controlled executable fixture",
    type: "web_app",
    assetId,
  });
  assert.equal(created.status, 201);
  const runId = (await created.json()).id;
  assert.equal(
    (await request(`/scans/${runId}/start`, tokenA, "POST", {})).status,
    200,
  );
  let scan;
  for (let attempt = 0; attempt < 100; attempt++) {
    scan = await (await request(`/scans/${runId}`, tokenA)).json();
    if (scan.status === "completed" || scan.status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(scan.status, "completed");
  assert(scan.findingsCount >= 1);
  const findings = await (
    await request(`/scans/${runId}/findings`, tokenA)
  ).json();
  assert(findings.length >= 1);
  const createdReport = await request("/reports", tokenA, "POST", {
    title: "Completed fixture report",
    type: "technical",
    format: "json",
    scanId: runId,
    assetId,
  });
  assert.equal(createdReport.status, 201);
  const completedReport = await createdReport.json();
  const download = await request(
    `/reports/${completedReport.id}/download`,
    tokenA,
  );
  assert.equal(download.status, 200);
  const report = await download.json();
  assert.equal(report.assessmentComplete, true);
  assert.equal(report.findings.length, findings.length);
  assert.equal((await request(`/scans/${runId}/findings`, tokenB)).status, 404);
});
