import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./auth.js";

describe("auth module", () => {
  describe("hashPassword", () => {
    it("throws an error if password is null/empty or shorter than 8 characters", async () => {
      await assert.rejects(
        async () => {
          await hashPassword("");
        },
        {
          name: "Error",
          message: "Password must be at least 8 characters.",
        }
      );

      await assert.rejects(
        async () => {
          await hashPassword("1234567");
        },
        {
          name: "Error",
          message: "Password must be at least 8 characters.",
        }
      );
    });

    it("hashes valid passwords into scrypt format with 6 dollar-separated parts", async () => {
      const password = "secure-password-123!";
      const hash = await hashPassword(password);

      assert.equal(typeof hash, "string");
      const parts = hash.split("$");
      assert.equal(parts.length, 6);
      assert.equal(parts[0], "scrypt");
      assert.equal(parts[1], "32768");
      assert.equal(parts[2], "8");
      assert.equal(parts[3], "1");
      assert.ok(parts[4]!.length > 0); // salt hex
      assert.ok(parts[5]!.length > 0); // key hex
    });

    it("generates different salts and hashes for the same password", async () => {
      const password = "same-password-different-salt";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      assert.notEqual(hash1, hash2);
    });
  });

  describe("verifyPassword", () => {
    it("returns true for a correct password matching a generated hash", async () => {
      const password = "MyVerySecretPassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      assert.equal(isValid, true);
    });

    it("returns false for an incorrect password", async () => {
      const password = "MyVerySecretPassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("WrongPassword123!", hash);
      assert.equal(isValid, false);
    });

    it("returns false for case-sensitive password mismatches", async () => {
      const password = "MyVerySecretPassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("myverysecretpassword123!", hash);
      assert.equal(isValid, false);
    });

    it("returns false if stored string is empty or completely invalid format", async () => {
      assert.equal(await verifyPassword("password123", ""), false);
      assert.equal(await verifyPassword("password123", "plain-text-password"), false);
      assert.equal(await verifyPassword("password123", "invalid$format$hash"), false);
    });

    it("returns false if stored scheme is not 'scrypt'", async () => {
      const invalidScheme = "argon2$32768$8$1$0123456789abcdef$0123456789abcdef";
      assert.equal(await verifyPassword("password123", invalidScheme), false);
    });

    it("returns false if stored hash does not have exactly 6 parts", async () => {
      const tooFewParts = "scrypt$32768$8$1$0123456789abcdef";
      const tooManyParts = "scrypt$32768$8$1$0123456789abcdef$0123456789abcdef$extra";

      assert.equal(await verifyPassword("password123", tooFewParts), false);
      assert.equal(await verifyPassword("password123", tooManyParts), false);
    });

    it("returns false if cost parameters (N, r, p) are not finite numbers", async () => {
      const nonNumericN = "scrypt$abc$8$1$0123456789abcdef$0123456789abcdef";
      const nanR = "scrypt$32768$NaN$1$0123456789abcdef$0123456789abcdef";
      const infinityP = "scrypt$32768$8$Infinity$0123456789abcdef$0123456789abcdef";

      assert.equal(await verifyPassword("password123", nonNumericN), false);
      assert.equal(await verifyPassword("password123", nanR), false);
      assert.equal(await verifyPassword("password123", infinityP), false);
    });

    it("returns false when scrypt throws due to invalid arguments or out-of-range parameters", async () => {
      // Negative N causes scrypt to fail
      const negativeN = "scrypt$-1$8$1$0123456789abcdef$0123456789abcdef";
      assert.equal(await verifyPassword("password123", negativeN), false);

      // Memory limit breach or invalid parameter set
      const invalidMem = "scrypt$100000000$8$1$0123456789abcdef$0123456789abcdef";
      assert.equal(await verifyPassword("password123", invalidMem), false);
    });

    it("returns false when key length in stored hash differs from derived length", async () => {
      // Key hex representing a 1-byte key instead of expected 64-byte key
      const shortKeyHash = "scrypt$32768$8$1$0123456789abcdef$ab";
      assert.equal(await verifyPassword("password123", shortKeyHash), false);
    });
  });
});
