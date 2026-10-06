import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { intelligenceReturn, authContinuation } from "./auth-return.js";

describe("intelligenceReturn", () => {
  it("returns null when 'next' parameter is missing", () => {
    assert.equal(intelligenceReturn(""), null);
    assert.equal(intelligenceReturn("search=cybersecurity"), null);
    assert.equal(intelligenceReturn("?search=threats"), null);
  });

  it("returns null when 'next' parameter is not equal to 'intelligence'", () => {
    assert.equal(intelligenceReturn("next=dashboard"), null);
    assert.equal(intelligenceReturn("?next=settings&search=test"), null);
    assert.equal(intelligenceReturn("?next=INTELLIGENCE&search=test"), null);
  });

  it("returns formatted intelligence URL when 'next' parameter is 'intelligence'", () => {
    assert.equal(
      intelligenceReturn("next=intelligence&search=cybersecurity"),
      "/intelligence?search=cybersecurity"
    );
    assert.equal(
      intelligenceReturn("?next=intelligence&search=threats"),
      "/intelligence?search=threats"
    );
  });

  it("handles missing or empty search parameter", () => {
    assert.equal(
      intelligenceReturn("next=intelligence"),
      "/intelligence?search="
    );
    assert.equal(
      intelligenceReturn("?next=intelligence&search="),
      "/intelligence?search="
    );
  });

  it("properly URL-encodes search parameter", () => {
    assert.equal(
      intelligenceReturn("?next=intelligence&search=threat%20%26%20risk"),
      "/intelligence?search=threat%20%26%20risk"
    );
    assert.equal(
      intelligenceReturn("?next=intelligence&search=hello world"),
      "/intelligence?search=hello%20world"
    );
    assert.equal(
      intelligenceReturn("?next=intelligence&search=🔒security"),
      "/intelligence?search=%F0%9F%94%92security"
    );
  });

  it("handles additional query parameters gracefully", () => {
    assert.equal(
      intelligenceReturn("?ref=email&next=intelligence&search=malware&utm_source=test"),
      "/intelligence?search=malware"
    );
  });
});

describe("authContinuation", () => {
  it("returns empty string when intelligenceReturn returns null", () => {
    assert.equal(authContinuation(""), "");
    assert.equal(authContinuation("?next=dashboard&search=test"), "");
  });

  it("returns formatted auth continuation query string when next is 'intelligence'", () => {
    assert.equal(
      authContinuation("?next=intelligence&search=phishing"),
      "?next=intelligence&search=phishing"
    );
  });

  it("handles missing search parameter in auth continuation", () => {
    assert.equal(
      authContinuation("?next=intelligence"),
      "?next=intelligence&search="
    );
  });

  it("properly URL-encodes search parameter in auth continuation", () => {
    assert.equal(
      authContinuation("?next=intelligence&search=cve-2024-1234%20%26%20exploit"),
      "?next=intelligence&search=cve-2024-1234%20%26%20exploit"
    );
    assert.equal(
      authContinuation("?next=intelligence&search=cyber threat"),
      "?next=intelligence&search=cyber%20threat"
    );
  });
});
