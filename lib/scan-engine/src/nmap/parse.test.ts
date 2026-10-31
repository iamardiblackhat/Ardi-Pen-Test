import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeXmlEntities, parseNmapXml, nmapToFindings } from "./parse";
import { ScanEngineError } from "../types";

describe("decodeXmlEntities", () => {
  it("decodes standard predefined XML entities", () => {
    assert.equal(decodeXmlEntities("&lt;tag&gt; &amp; &quot;quote&quot; &apos;single&apos;"), '<tag> & "quote" \'single\'');
  });

  it("decodes decimal numeric character references", () => {
    assert.equal(decodeXmlEntities("&#65;&#66;&#67;"), "ABC");
  });

  it("decodes hexadecimal numeric character references", () => {
    assert.equal(decodeXmlEntities("&#x41;&#x42;&#x43; &#X61;&#X62;&#X63;"), "ABC abc");
  });

  it("handles text with no ampersands", () => {
    assert.equal(decodeXmlEntities("plain text"), "plain text");
  });

  it("performs a single pass without double decoding entity bypasses", () => {
    // &amp;lt; should decode to &lt;, not <
    assert.equal(decodeXmlEntities("&amp;lt;"), "&lt;");
  });

  it("leaves unknown named entities intact", () => {
    assert.equal(decodeXmlEntities("&unknown; &foo;"), "&unknown; &foo;");
  });

  it("leaves invalid or out-of-bounds numeric references intact", () => {
    assert.equal(decodeXmlEntities("&#x110000;"), "&#x110000;"); // > 0x10FFFF
    assert.equal(decodeXmlEntities("&#d800;"), "&#d800;"); // lone surrogate
    assert.equal(decodeXmlEntities("&#xZZ;"), "&#xZZ;"); // invalid hex
  });
});

describe("parseNmapXml", () => {
  describe("input validation", () => {
    it("throws ScanEngineError if input is not a string", () => {
      assert.throws(
        // @ts-expect-command invalid input type test
        () => parseNmapXml(123 as unknown as string),
        (err: unknown) => {
          assert(err instanceof ScanEngineError);
          assert.equal(err.code, "parse_error");
          assert.match(err.message, /must be a string/);
          return true;
        }
      );
    });

    it("throws ScanEngineError if input exceeds MAX_XML_BYTES", () => {
      // Mocking a huge string logically or testing string check
      const hugeXml = "<nmaprun>" + "a".repeat(64 * 1024 * 1024 + 1);
      assert.throws(
        () => parseNmapXml(hugeXml),
        (err: unknown) => {
          assert(err instanceof ScanEngineError);
          assert.equal(err.code, "parse_error");
          assert.match(err.message, /exceeds the 67108864 byte parse limit/);
          return true;
        }
      );
    });

    it("throws ScanEngineError if input lacks <nmaprun> or <host>", () => {
      assert.throws(
        () => parseNmapXml("<html><body>Not nmap</body></html>"),
        (err: unknown) => {
          assert(err instanceof ScanEngineError);
          assert.equal(err.code, "parse_error");
          assert.match(err.message, /Input does not look like nmap XML/);
          return true;
        }
      );
    });
  });

  describe("XML structure parsing", () => {
    it("parses valid nmap XML with host, addresses, ports, services and CPEs", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap -sV -p 80,443 192.168.1.1">
  <!-- Scan comment -->
  <host>
    <status state="up" reason="echo-reply"/>
    <address addr="192.168.1.1" addrtype="ipv4"/>
    <address addr="00:11:22:33:44:55" addrtype="mac" vendor="VendorName"/>
    <hostnames>
      <hostname name="example.com" type="user"/>
    </hostnames>
    <ports>
      <port protocol="tcp" portid="80">
        <state state="open" reason="syn-ack"/>
        <service name="http" product="Apache httpd" version="2.4.41" extrainfo="(Ubuntu)" cpe="cpe:/a:apache:http_server:2.4.41"/>
      </port>
      <port protocol="tcp" portid="443">
        <state state="open" reason="syn-ack"/>
        <service name="https" product="nginx" version="1.18.0" tunnel="ssl">
          <cpe>cpe:/a:nginx:nginx:1.18.0</cpe>
        </service>
      </port>
      <port protocol="tcp" portid="22">
        <state state="closed" reason="reset"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const res = parseNmapXml(xml);
      assert.equal(res.warnings.length, 0);
      assert.equal(res.hosts.length, 1);

      const host = res.hosts[0]!;
      assert.equal(host.primaryAddress, "192.168.1.1");
      assert.equal(host.status, "up");
      assert.equal(host.addresses.length, 2);
      assert.deepEqual(host.addresses[0], { addr: "192.168.1.1", addrtype: "ipv4", vendor: null });
      assert.deepEqual(host.addresses[1], { addr: "00:11:22:33:44:55", addrtype: "mac", vendor: "VendorName" });
      assert.deepEqual(host.hostnames, [{ name: "example.com", type: "user" }]);

      assert.equal(host.ports.length, 3);
      assert.equal(host.ports[0]?.portid, 80);
      assert.equal(host.ports[0]?.state, "open");
      assert.equal(host.ports[0]?.reason, "syn-ack");
      assert.deepEqual(host.ports[0]?.service, {
        name: "http",
        product: "Apache httpd",
        version: "2.4.41",
        extrainfo: "(Ubuntu)",
        tunnel: null,
        cpe: ["cpe:/a:apache:http_server:2.4.41"],
      });

      assert.equal(host.ports[1]?.portid, 443);
      assert.deepEqual(host.ports[1]?.service, {
        name: "https",
        product: "nginx",
        version: "1.18.0",
        extrainfo: null,
        tunnel: "ssl",
        cpe: ["cpe:/a:nginx:nginx:1.18.0"],
      });
    });

    it("handles primary address selection fallback order (IPv4 -> first address -> first hostname -> unknown)", () => {
      const xmlIPv6Only = `<nmaprun><host><address addr="fe80::1" addrtype="ipv6"/></host></nmaprun>`;
      assert.equal(parseNmapXml(xmlIPv6Only).hosts[0]?.primaryAddress, "fe80::1");

      const xmlHostnameOnly = `<nmaprun><host><hostnames><hostname name="HOST.LOCAL" type="user"/></hostnames></host></nmaprun>`;
      assert.equal(parseNmapXml(xmlHostnameOnly).hosts[0]?.primaryAddress, "host.local");

      const xmlEmptyHost = `<nmaprun><host></host></nmaprun>`;
      assert.equal(parseNmapXml(xmlEmptyHost).hosts[0]?.primaryAddress, "unknown");
    });

    it("combines and deduplicates CPEs from attributes and child elements", () => {
      const xml = `<nmaprun>
        <host>
          <address addr="10.0.0.1" addrtype="ipv4"/>
          <ports>
            <port protocol="tcp" portid="80">
              <state state="open"/>
              <service name="http" cpe="cpe:/a:vendor:product:1.0">
                <cpe>cpe:/a:vendor:product:1.0</cpe>
                <cpe>cpe:/a:vendor:product_alt:1.0</cpe>
              </service>
            </port>
          </ports>
        </host>
      </nmaprun>`;

      const res = parseNmapXml(xml);
      assert.deepEqual(res.hosts[0]?.ports[0]?.service?.cpe, [
        "cpe:/a:vendor:product:1.0",
        "cpe:/a:vendor:product_alt:1.0",
      ]);
    });
  });

  describe("resilience and edge cases", () => {
    it("handles nested <host> elements by closing the previous one and emitting a warning", () => {
      const xml = `<nmaprun>
        <host>
          <address addr="10.0.0.1" addrtype="ipv4"/>
          <host>
            <address addr="10.0.0.2" addrtype="ipv4"/>
          </host>
        </host>
      </nmaprun>`;

      const res = parseNmapXml(xml);
      assert.equal(res.hosts.length, 2);
      assert.equal(res.hosts[0]?.primaryAddress, "10.0.0.1");
      assert.equal(res.hosts[1]?.primaryAddress, "10.0.0.2");
      assert.equal(res.warnings.length, 1);
      assert.match(res.warnings[0]!, /nested <host>/);
    });

    it("handles unclosed <host> element at EOF with warning", () => {
      const xml = `<nmaprun><host><address addr="10.0.0.1" addrtype="ipv4"/>`;
      const res = parseNmapXml(xml);
      assert.equal(res.hosts.length, 1);
      assert.equal(res.hosts[0]?.primaryAddress, "10.0.0.1");
      assert.equal(res.warnings.length, 1);
      assert.match(res.warnings[0]!, /unclosed <host>/);
    });

    it("skips address without addr attribute and records warning", () => {
      const xml = `<nmaprun><host><address addrtype="ipv4"/></host></nmaprun>`;
      const res = parseNmapXml(xml);
      assert.equal(res.warnings.length, 1);
      assert.match(res.warnings[0]!, /Skipped an <address> element with no addr/);
    });

    it("skips port with invalid or out-of-range portid and records warning", () => {
      const xml = `<nmaprun>
        <host>
          <address addr="10.0.0.1" addrtype="ipv4"/>
          <ports>
            <port protocol="tcp" portid="invalid">
              <state state="open"/>
            </port>
            <port protocol="tcp" portid="70000">
              <state state="open"/>
            </port>
          </ports>
        </host>
      </nmaprun>`;

      const res = parseNmapXml(xml);
      assert.equal(res.hosts[0]?.ports.length, 0);
      assert.equal(res.warnings.length, 2);
      assert.match(res.warnings[0]!, /invalid portid: "invalid"/);
      assert.match(res.warnings[1]!, /invalid portid: "70000"/);
    });

    it("ignores comments, CDATA, processing instructions and DOCTYPE", () => {
      const xml = `<?xml version="1.0"?>
<!DOCTYPE nmaprun [ <!ELEMENT foo ANY> ]>
<nmaprun>
  <!-- <host><address addr="1.1.1.1" addrtype="ipv4"/></host> -->
  <![CDATA[ <host><address addr="2.2.2.2" addrtype="ipv4"/></host> ]]>
  <host>
    <address addr="3.3.3.3" addrtype="ipv4"/>
  </host>
</nmaprun>`;

      const res = parseNmapXml(xml);
      assert.equal(res.hosts.length, 1);
      assert.equal(res.hosts[0]?.primaryAddress, "3.3.3.3");
    });

    it("first attribute value wins when duplicate attributes appear", () => {
      const xml = `<nmaprun><host><address addr="10.0.0.1" addr="10.0.0.2" addrtype="ipv4"/></host></nmaprun>`;
      const res = parseNmapXml(xml);
      assert.equal(res.hosts[0]?.primaryAddress, "10.0.0.1");
    });

    it("sanitises control characters and truncates long field values", () => {
      const longBanner = "a".repeat(2000);
      const xml = `<nmaprun>
        <host>
          <address addr="10.0.0.1" addrtype="ipv4"/>
          <ports>
            <port protocol="tcp" portid="80">
              <state state="open"/>
              <service name="http" product="foo\x00bar\x07" version="${longBanner}"/>
            </port>
          </ports>
        </host>
      </nmaprun>`;

      const res = parseNmapXml(xml);
      const service = res.hosts[0]?.ports[0]?.service;
      assert.equal(service?.product, "foo bar");
      assert(service?.version?.endsWith("…"));
      assert.equal(service?.version?.length, 1025); // 1024 + 1 char '…'
    });
  });
});

describe("nmapToFindings", () => {
  it("converts open ports to findings and ignores non-open ports", () => {
    const xml = `<nmaprun>
      <host>
        <address addr="192.168.1.10" addrtype="ipv4"/>
        <ports>
          <port protocol="tcp" portid="80">
            <state state="open" reason="syn-ack"/>
            <service name="http" product="Apache" version="2.4"/>
          </port>
          <port protocol="tcp" portid="22">
            <state state="closed" reason="reset"/>
          </port>
          <port protocol="tcp" portid="443">
            <state state="filtered" reason="no-response"/>
          </port>
        </ports>
      </host>
    </nmaprun>`;

    const parsed = parseNmapXml(xml);
    const findings = nmapToFindings(parsed);

    assert.equal(findings.length, 1);
    const f = findings[0]!;
    assert.equal(f.title, "Open port 80/tcp (http)");
    assert.equal(f.severity, "info");
    assert.equal(f.category, "network");
    assert.equal(f.source, "nmap");
    assert.equal(f.target, "192.168.1.10:80/tcp");
    assert.equal(f.cvss, null);
    assert.equal(f.mitre, null);
    assert.equal(f.fingerprint, "nmap:192.168.1.10:tcp:80");
    assert.match(f.description, /Port 80\/tcp is open on 192\.168\.1\.10, running Apache 2\.4/);
    assert.match(f.evidence!, /state=open/);
    assert.match(f.evidence!, /service=http/);
    assert.match(f.evidence!, /banner=Apache 2\.4/);
  });

  it("assigns appropriate high/critical severity and risk explanation for risky ports", () => {
    const xml = `<nmaprun>
      <host>
        <address addr="10.0.0.5" addrtype="ipv4"/>
        <ports>
          <port protocol="tcp" portid="6379">
            <state state="open"/>
            <service name="redis"/>
          </port>
          <port protocol="tcp" portid="3389">
            <state state="open"/>
            <service name="ms-wbt-server"/>
          </port>
        </ports>
      </host>
    </nmaprun>`;

    const parsed = parseNmapXml(xml);
    const findings = nmapToFindings(parsed);

    assert.equal(findings.length, 2);

    const redisFinding = findings.find((f) => f.target.includes("6379"))!;
    assert.equal(redisFinding.severity, "critical");
    assert.match(redisFinding.description, /Redis is unauthenticated by default/);

    const rdpFinding = findings.find((f) => f.target.includes("3389"))!;
    assert.equal(rdpFinding.severity, "high");
    assert.match(rdpFinding.description, /RDP is a leading initial-access vector/);
  });
});
