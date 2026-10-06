import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "./auth.js";

describe("signToken", () => {
  const originalEnv = process.env;
  const validSecret = "super-secret-jwt-key-with-at-least-16-chars";

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws an error when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    assert.throws(
      () => signToken({ id: 1, email: "user@example.com", role: "admin" }),
      {
        name: "Error",
        message: /JWT_SECRET is missing or too short/,
      }
    );
  });

  it("throws an error when JWT_SECRET is less than 16 characters", () => {
    process.env.JWT_SECRET = "too-short";
    assert.throws(
      () => signToken({ id: 1, email: "user@example.com", role: "admin" }),
      {
        name: "Error",
        message: /JWT_SECRET is missing or too short/,
      }
    );
  });

  it("generates a valid 3-part JWT structure when JWT_SECRET is valid", () => {
    process.env.JWT_SECRET = validSecret;
    const user = { id: 42, email: "test@example.com", role: "user" };
    const token = signToken(user);

    assert.equal(typeof token, "string");
    const parts = token.split(".");
    assert.equal(parts.length, 3, "JWT should consist of 3 dot-separated parts");
    assert.ok(parts[0].length > 0, "Header part should not be empty");
    assert.ok(parts[1].length > 0, "Payload part should not be empty");
    assert.ok(parts[2].length > 0, "Signature part should not be empty");
  });

  it("encodes header and payload with correct claims and timestamps", () => {
    process.env.JWT_SECRET = validSecret;

    const fakeNowMs = 1700000000000; // 1700000000 seconds
    const fakeNowSec = 1700000000;
    const originalDateNow = Date.now;
    Date.now = () => fakeNowMs;

    try {
      const user = { id: 101, email: "analyst@security.org", role: "analyst" };
      const token = signToken(user);
      const [headerB64, payloadB64] = token.split(".");

      const headerJson = JSON.parse(Buffer.from(headerB64!, "base64url").toString("utf-8"));
      assert.deepEqual(headerJson, { alg: "HS256", typ: "JWT" });

      const payloadJson = JSON.parse(Buffer.from(payloadB64!, "base64url").toString("utf-8"));
      assert.equal(payloadJson.sub, 101);
      assert.equal(payloadJson.email, "analyst@security.org");
      assert.equal(payloadJson.role, "analyst");
      assert.equal(payloadJson.iat, fakeNowSec);
      assert.equal(payloadJson.exp, fakeNowSec + 7 * 24 * 60 * 60);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it("handles boundary user IDs and special characters in user fields", () => {
    process.env.JWT_SECRET = validSecret;

    const testUsers = [
      { id: 0, email: "zero@example.com", role: "viewer" },
      { id: 999999999, email: "user+tag@domain.co.uk", role: "operator/admin" },
      { id: 1, email: "unicode_🔒@domain.com", role: "admin" },
    ];

    for (const user of testUsers) {
      const token = signToken(user);
      const verified = verifyToken(token);
      assert.ok(verified !== null);
      assert.equal(verified?.sub, user.id);
      assert.equal(verified?.email, user.email);
      assert.equal(verified?.role, user.role);
    }
  });

  it("creates a token verifiable by verifyToken and fails verification if modified", () => {
    process.env.JWT_SECRET = validSecret;
    const user = { id: 5, email: "victim@example.com", role: "user" };
    const token = signToken(user);

    // Should verify successfully
    const payload = verifyToken(token);
    assert.ok(payload !== null);
    assert.equal(payload?.sub, 5);

    // Tampered payload
    const parts = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...payload, role: "superadmin" })
    ).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    assert.equal(verifyToken(tamperedToken), null);

    // Tampered signature
    const corruptedSigToken = `${parts[0]}.${parts[1]}.invalid-signature`;
    assert.equal(verifyToken(corruptedSigToken), null);
  });

  it("fails verification if verified under a different JWT_SECRET", () => {
    process.env.JWT_SECRET = validSecret;
    const user = { id: 8, email: "user8@example.com", role: "user" };
    const token = signToken(user);

    // Change JWT_SECRET to something else
    process.env.JWT_SECRET = "another-different-secret-key-12345";
    assert.equal(verifyToken(token), null);
  });

  it("rejects expired tokens during verifyToken", () => {
    process.env.JWT_SECRET = validSecret;
    const fakeNowMs = 1700000000000;
    const originalDateNow = Date.now;

    try {
      // Issue token at t=1700000000
      Date.now = () => fakeNowMs;
      const user = { id: 12, email: "exp@example.com", role: "user" };
      const token = signToken(user);

      // Fast forward past expiry (7 days + 1 second)
      Date.now = () => fakeNowMs + (7 * 24 * 60 * 60 + 1) * 1000;

      assert.equal(verifyToken(token), null, "Expired token should return null");
    } finally {
      Date.now = originalDateNow;
    }
  });
});
