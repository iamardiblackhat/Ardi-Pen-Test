import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken, hashPassword, verifyPassword } from "../lib/auth";
import { extractToken } from "../middlewares/require-auth";
import type { Request } from "express";

// Set a valid secret for unit tests
process.env.JWT_SECRET = "test_jwt_secret_min_16_chars_long_123456";

describe("Auth primitives & Cookie extraction", () => {
  test("hashPassword and verifyPassword work correctly", async () => {
    const password = "SecurePassword123!";
    const hash = await hashPassword(password);
    assert.ok(hash.startsWith("scrypt$"));

    const valid = await verifyPassword(password, hash);
    assert.equal(valid, true);

    const invalid = await verifyPassword("WrongPassword!", hash);
    assert.equal(invalid, false);
  });

  test("signToken and verifyToken work correctly", () => {
    const user = { id: 42, email: "test@example.com", role: "admin" };
    const token = signToken(user);
    assert.ok(typeof token === "string");
    assert.equal(token.split(".").length, 3);

    const payload = verifyToken(token);
    assert.ok(payload !== null);
    assert.equal(payload?.sub, 42);
    assert.equal(payload?.email, "test@example.com");
    assert.equal(payload?.role, "admin");
  });

  test("verifyToken rejects invalid or tampered token", () => {
    const invalidToken = "invalid.jwt.token";
    assert.equal(verifyToken(invalidToken), null);
  });

  test("extractToken prioritizes req.cookies.ardi_auth over Authorization header", () => {
    const cookieReq = {
      cookies: { ardi_auth: "cookie_token_123" },
      headers: { authorization: "Bearer header_token_456" },
    } as unknown as Request;

    assert.equal(extractToken(cookieReq), "cookie_token_123");
  });

  test("extractToken falls back to Authorization header when cookie is missing", () => {
    const headerReq = {
      cookies: {},
      headers: { authorization: "Bearer header_token_456" },
    } as unknown as Request;

    assert.equal(extractToken(headerReq), "header_token_456");
  });

  test("extractToken returns null when neither cookie nor Authorization header is present", () => {
    const emptyReq = {
      cookies: {},
      headers: {},
    } as unknown as Request;

    assert.equal(extractToken(emptyReq), null);
  });
});
