import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signToken, verifyToken, hashPassword, verifyPassword } from "./auth.js";

const TEST_SECRET = "super-secret-key-1234567890-test-secret";

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createCustomToken(headerObj: unknown, payloadObj: unknown, secret: string = TEST_SECRET): string {
  const headerB64 = base64url(JSON.stringify(headerObj));
  const payloadB64 = base64url(JSON.stringify(payloadObj));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = base64url(createHmac("sha256", secret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

describe("auth.ts", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env["JWT_SECRET"];
    process.env["JWT_SECRET"] = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env["JWT_SECRET"] = originalSecret;
    } else {
      delete process.env["JWT_SECRET"];
    }
  });

  describe("getSecret (via signToken and verifyToken)", () => {
    test("throws an error if JWT_SECRET is missing", () => {
      delete process.env["JWT_SECRET"];
      assert.throws(
        () => signToken({ id: 1, email: "test@example.com", role: "admin" }),
        /JWT_SECRET is missing or too short/,
      );
      assert.throws(
        () => verifyToken("header.payload.sig"),
        /JWT_SECRET is missing or too short/,
      );
    });

    test("throws an error if JWT_SECRET is shorter than 16 characters", () => {
      process.env["JWT_SECRET"] = "short_secret";
      assert.throws(
        () => signToken({ id: 1, email: "test@example.com", role: "admin" }),
        /JWT_SECRET is missing or too short/,
      );
      assert.throws(
        () => verifyToken("header.payload.sig"),
        /JWT_SECRET is missing or too short/,
      );
    });
  });

  describe("signToken & verifyToken happy path", () => {
    test("signs a token and verifies it successfully", () => {
      const user = { id: 42, email: "alice@example.com", role: "user" };
      const token = signToken(user);

      assert.equal(typeof token, "string");
      assert.equal(token.split(".").length, 3);

      const payload = verifyToken(token);
      assert.notEqual(payload, null);
      assert.equal(payload!.sub, 42);
      assert.equal(payload!.email, "alice@example.com");
      assert.equal(payload!.role, "user");
      assert.equal(typeof payload!.iat, "number");
      assert.equal(typeof payload!.exp, "number");
      assert.equal(payload!.exp - payload!.iat, 7 * 24 * 60 * 60);
    });
  });

  describe("verifyToken validation & security edge cases", () => {
    test("returns null for malformed tokens that do not have 3 parts", () => {
      assert.equal(verifyToken(""), null);
      assert.equal(verifyToken("part1"), null);
      assert.equal(verifyToken("part1.part2"), null);
      assert.equal(verifyToken("part1.part2.part3.part4"), null);
    });

    test("returns null if signature is invalid or tampered", () => {
      const token = signToken({ id: 1, email: "test@example.com", role: "admin" });
      const [header, payload, sig] = token.split(".");
      const tamperedToken = `${header}.${payload}.${sig}tampered`;

      assert.equal(verifyToken(tamperedToken), null);
    });

    test("returns null if payload is modified without updating signature", () => {
      const token = signToken({ id: 1, email: "test@example.com", role: "admin" });
      const [header, , sig] = token.split(".");

      const modifiedPayloadObj = {
        sub: 1,
        email: "hacker@example.com",
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const modifiedPayloadB64 = base64url(JSON.stringify(modifiedPayloadObj));
      const tamperedToken = `${header}.${modifiedPayloadB64}.${sig}`;

      assert.equal(verifyToken(tamperedToken), null);
    });

    test("returns null if token was signed with a different secret", () => {
      const header = { alg: "HS256", typ: "JWT" };
      const payload = {
        sub: 1,
        email: "test@example.com",
        role: "user",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const tokenFromOtherSecret = createCustomToken(header, payload, "different-secret-key-12345678");

      assert.equal(verifyToken(tokenFromOtherSecret), null);
    });

    test("returns null if payload is not valid JSON", () => {
      const headerB64 = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payloadB64 = base64url("not-json-content");
      const signingInput = `${headerB64}.${payloadB64}`;

      const sig = base64url(createHmac("sha256", TEST_SECRET).update(signingInput).digest());
      const token = `${signingInput}.${sig}`;

      assert.equal(verifyToken(token), null);
    });

    test("returns null if token is expired", () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        sub: 1,
        email: "test@example.com",
        role: "user",
        iat: now - 7200,
        exp: now - 3600, // expired 1 hour ago
      };

      const token = createCustomToken({ alg: "HS256", typ: "JWT" }, expiredPayload);
      assert.equal(verifyToken(token), null);
    });

    test("returns null if exp is missing or not a number", () => {
      const payloadNoExp = {
        sub: 1,
        email: "test@example.com",
        role: "user",
        iat: Math.floor(Date.now() / 1000),
      };
      const tokenNoExp = createCustomToken({ alg: "HS256", typ: "JWT" }, payloadNoExp);
      assert.equal(verifyToken(tokenNoExp), null);

      const payloadStringExp = {
        sub: 1,
        email: "test@example.com",
        role: "user",
        iat: Math.floor(Date.now() / 1000),
        exp: "never",
      };
      const tokenStringExp = createCustomToken({ alg: "HS256", typ: "JWT" }, payloadStringExp);
      assert.equal(verifyToken(tokenStringExp), null);
    });
  });

  describe("password hashing and verification", () => {
    test("throws an error if password is shorter than 8 characters", async () => {
      await assert.rejects(
        async () => {
          await hashPassword("short");
        },
        {
          name: "Error",
          message: "Password must be at least 8 characters.",
        },
      );
    });

    test("hashes password and verifies it successfully", async () => {
      const password = "securePassword123!";
      const hash = await hashPassword(password);

      assert.equal(typeof hash, "string");
      assert.ok(hash.startsWith("scrypt$"));

      const isValid = await verifyPassword(password, hash);
      assert.equal(isValid, true);

      const isInvalid = await verifyPassword("wrongPassword", hash);
      assert.equal(isInvalid, false);
    });

    test("returns false for malformed hash strings", async () => {
      assert.equal(await verifyPassword("password123", "invalid-hash"), false);
      assert.equal(await verifyPassword("password123", "scrypt$invalid$format"), false);
      assert.equal(await verifyPassword("password123", "scrypt$32768$8$1$salt$key$extra"), false);
      assert.equal(await verifyPassword("password123", "scrypt$abc$8$1$salt$key"), false);
    });
  });
});
