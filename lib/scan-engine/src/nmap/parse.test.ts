import test from "node:test";
import assert from "node:assert/strict";
import { parseNmapXml, nmapToFindings, decodeXmlEntities } from "./parse";
import { ScanEngineError } from "../types";

test("parseNmapXml - basic well-formed nmap output", () => {
  const xml = `
    <nmaprun>
      <host>
        <status state="up" />
        <address addr="192.168.1.1" addrtype="ipv4" vendor="Router Corp" />
        <hostname name="router.local" type="user" />
        <ports>
          <port protocol="tcp" portid="80">
            <state state="open" reason="syn-ack" />
            <service name="http" product="Apache httpd" version="2.4.41" extrainfo="(Ubuntu)" tunnel="ssl" cpe="cpe:/a:apache:http_server:2.4.41">
              <cpe>cpe:/a:apache:http_server:2.4.41</cpe>
            </service>
          </port>
        </ports>
      </host>
    </nmaprun>
  `;

  const result = parseNmapXml(xml);
  assert.strictEqual(result.warnings.length, 0);
  assert.strictEqual(result.hosts.length, 1);

  const host = result.hosts[0]!;
  assert.strictEqual(host.status, "up");
  assert.strictEqual(host.primaryAddress, "192.168.1.1");
  assert.strictEqual(host.addresses.length, 1);
  assert.strictEqual(host.addresses[0]?.addr, "192.168.1.1");
  assert.strictEqual(host.addresses[0]?.vendor, "Router Corp");
  assert.strictEqual(host.hostnames.length, 1);
  assert.strictEqual(host.hostnames[0]?.name, "router.local");

  assert.strictEqual(host.ports.length, 1);
  const port = host.ports[0]!;
  assert.strictEqual(port.protocol, "tcp");
  assert.strictEqual(port.portid, 80);
  assert.strictEqual(port.state, "open");
  assert.strictEqual(port.reason, "syn-ack");
  assert.notStrictEqual(port.service, null);
  assert.strictEqual(port.service?.name, "http");
  assert.strictEqual(port.service?.product, "Apache httpd");
  assert.strictEqual(port.service?.version, "2.4.41");
  assert.deepStrictEqual(port.service?.cpe, ["cpe:/a:apache:http_server:2.4.41"]);
});

test("parseNmapXml - throws on invalid input", () => {
  // @ts-expect-error test non-string input
  assert.throws(() => parseNmapXml(123), ScanEngineError);
  assert.throws(() => parseNmapXml("invalid xml with no host or nmaprun"), ScanEngineError);
});

test("parseNmapXml - warnings on malformed elements", () => {
  const xml = `
    <nmaprun>
      <host>
        <address addrtype="ipv4" /> <!-- missing addr -->
        <ports>
          <port protocol="tcp" portid="invalid">
            <state state="open" />
          </port>
        </ports>
      </host>
    </nmaprun>
  `;

  const result = parseNmapXml(xml);
  assert.strictEqual(result.warnings.length, 2);
  assert.match(result.warnings[0]!, /Skipped an <address> element/);
  assert.match(result.warnings[1]!, /Skipped a <port> with an invalid portid/);
});

test("parseNmapXml - handles nested/unclosed host and unclosed XML", () => {
  const xml = `
    <nmaprun>
      <host>
        <address addr="10.0.0.1" addrtype="ipv4" />
        <host> <!-- nested host -->
          <address addr="10.0.0.2" addrtype="ipv4" />
  `;

  const result = parseNmapXml(xml);
  assert.strictEqual(result.hosts.length, 2);
  assert.strictEqual(result.hosts[0]?.primaryAddress, "10.0.0.1");
  assert.strictEqual(result.hosts[1]?.primaryAddress, "10.0.0.2");
  assert.strictEqual(result.warnings.length, 2);
  assert.match(result.warnings[0]!, /Encountered a nested <host>/);
  assert.match(result.warnings[1]!, /unclosed <host>/);
});

test("parseNmapXml - deduplicates CPE entries", () => {
  const xml = `
    <nmaprun>
      <host>
        <address addr="127.0.0.1" addrtype="ipv4" />
        <ports>
          <port protocol="tcp" portid="22">
            <state state="open" />
            <service name="ssh" cpe="cpe:/a:openbsd:openssh:8.0">
              <cpe>cpe:/a:openbsd:openssh:8.0</cpe>
              <cpe>cpe:/a:openbsd:openssh:8.0</cpe>
              <cpe>cpe:/a:openbsd:openssh:8.1</cpe>
            </service>
          </port>
        </ports>
      </host>
    </nmaprun>
  `;

  const result = parseNmapXml(xml);
  const service = result.hosts[0]?.ports[0]?.service;
  assert.deepStrictEqual(service?.cpe, [
    "cpe:/a:openbsd:openssh:8.0",
    "cpe:/a:openbsd:openssh:8.1",
  ]);
});

test("nmapToFindings - maps open risky and standard ports correctly", () => {
  const xml = `
    <nmaprun>
      <host>
        <address addr="10.0.0.1" addrtype="ipv4" />
        <ports>
          <port protocol="tcp" portid="6379">
            <state state="open" />
            <service name="redis" product="Redis key-value store" version="6.0.0" />
          </port>
          <port protocol="tcp" portid="8080">
            <state state="closed" />
          </port>
        </ports>
      </host>
    </nmaprun>
  `;

  const scanResult = parseNmapXml(xml);
  const findings = nmapToFindings(scanResult);

  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0]?.severity, "critical");
  assert.strictEqual(findings[0]?.title, "Open port 6379/tcp (redis)");
  assert.strictEqual(findings[0]?.target, "10.0.0.1:6379/tcp");
});
