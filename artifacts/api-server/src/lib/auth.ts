import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * Authentication primitives — password hashing and signed session tokens.
 *
 * Zero dependencies: Node's built-in crypto gives us scrypt (a memory-hard
 * password KDF, deliberately slow) and HMAC-SHA256 (for tamper-proof tokens).
 * This avoids pulling argon2/bcrypt/jsonwebtoken, which also sidesteps the
 * workspace's supply-chain minimum-release-age policy.
 *
 * This replaces the previous demo scheme, where the token was base64(id:email)
 * — trivially forgeable — and any password was accepted. Neither is acceptable
 * in a security product.
 */

// promisify picks the no-options scrypt overload; wrap it so the options
// object (cost parameters) is accepted and typed.
const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// scrypt parameters. N=2^15 is a sensible interactive-login cost on a server;
// raise if your hardware can afford it. Stored in the hash string so existing
// hashes stay verifiable if you change these later.
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

/** Produce a self-describing hash: scrypt$N$r$p$salthex$keyhex */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const salt = randomBytes(SALT_LEN);
  const key = (await scrypt(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2,
  })) as Buffer;
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Verify a password against a stored hash, in constant time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, saltHex, keyHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltHex!, "hex");
  const expected = Buffer.from(keyHex!, "hex");

  let derived: Buffer;
  try {
    derived = (await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    })) as Buffer;
  } catch {
    return false;
  }

  // Lengths must match before timingSafeEqual, and the comparison itself is
  // constant-time so a wrong password can't be distinguished by timing.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// ── Session tokens (JWT, HS256) ──────────────────────────────────────────────

export interface TokenPayload {
  /** user id */
  sub: number;
  email: string;
  role: string;
  /** issued-at / expiry, seconds since epoch */
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlJson(obj: unknown): string {
  return base64url(JSON.stringify(obj));
}

function getSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret || secret.length < 16) {
    // Fail loud at call time rather than signing with a guessable secret.
    // A production deploy that forgets JWT_SECRET must not silently issue
    // forgeable tokens.
    throw new Error(
      "JWT_SECRET is missing or too short (need >= 16 chars). Generate one with: openssl rand -base64 48",
    );
  }
  return secret;
}

export function signToken(user: { id: number; email: string; role: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const signature = base64url(createHmac("sha256", getSecret()).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

/** Verify a token's signature and expiry. Returns the payload or null. */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const expectedSig = base64url(createHmac("sha256", getSecret()).update(signingInput).digest());

  // Constant-time signature comparison.
  const a = Buffer.from(signatureB64!);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64!, "base64").toString("utf-8"));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return null; // expired
  }
  return payload;
}
