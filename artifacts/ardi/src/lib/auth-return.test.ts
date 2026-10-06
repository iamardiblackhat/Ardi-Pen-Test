import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { intelligenceReturn, authContinuation } from "./auth-return.js";

describe("intelligenceReturn", () => {
  it("returns intelligence URL path when next=intelligence with search query", () => {
    const result = intelligenceReturn("?next=intelligence&search=cyberstrike");
    assert.strictEqual(result, "/intelligence?search=cyberstrike");
  });

  it("handles input search string without leading question mark", () => {
    const result = intelligenceReturn("next=intelligence&search=cve-2024-1234");
    assert.strictEqual(result, "/intelligence?search=cve-2024-1234");
  });

  it("URL-encodes search query containing spaces and special characters", () => {
    const result = intelligenceReturn("?next=intelligence&search=apt 29 & malware");
    assert.strictEqual(result, "/intelligence?search=apt%2029%20%26%20malware");
  });

  it("handles missing search parameter by returning empty search query", () => {
    const result = intelligenceReturn("?next=intelligence");
    assert.strictEqual(result, "/intelligence?search=");
  });

  it("handles empty search parameter", () => {
    const result = intelligenceReturn("?next=intelligence&search=");
    assert.strictEqual(result, "/intelligence?search=");
  });

  it("preserves other query parameters and extracts intelligence search", () => {
    const result = intelligenceReturn("?utm_source=email&next=intelligence&search=ransomware&version=2");
    assert.strictEqual(result, "/intelligence?search=ransomware");
  });

  it("returns null when next parameter is not intelligence", () => {
    assert.strictEqual(intelligenceReturn("?next=dashboard&search=test"), null);
    assert.strictEqual(intelligenceReturn("?next=login"), null);
    assert.strictEqual(intelligenceReturn("?next=INTELLIGENCE&search=test"), null);
  });

  it("returns null when next parameter is missing", () => {
    assert.strictEqual(intelligenceReturn("?search=test"), null);
  });

  it("returns null when search string is empty", () => {
    assert.strictEqual(intelligenceReturn(""), null);
  });
});

describe("authContinuation", () => {
  it("returns continuation query string when next=intelligence with search query", () => {
    const result = authContinuation("?next=intelligence&search=threat");
    assert.strictEqual(result, "?next=intelligence&search=threat");
  });

  it("URL-encodes search query in authContinuation output", () => {
    const result = authContinuation("?next=intelligence&search=foo bar");
    assert.strictEqual(result, "?next=intelligence&search=foo%20bar");
  });

  it("handles missing search parameter in authContinuation", () => {
    const result = authContinuation("?next=intelligence");
    assert.strictEqual(result, "?next=intelligence&search=");
  });

  it("returns empty string when next is not intelligence", () => {
    assert.strictEqual(authContinuation("?next=other&search=test"), "");
    assert.strictEqual(authContinuation("?search=test"), "");
  });

  it("returns empty string for empty input string", () => {
    assert.strictEqual(authContinuation(""), "");
  });
});
