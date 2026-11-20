import dns from "node:dns/promises";

export interface EmailDnsAuditResult {
  domain: string;
  checkedAt: string;
  overallStatus: "protected" | "partial" | "vulnerable";
  summary: string;
  spf: {
    present: boolean;
    record: string | null;
    strict: boolean;
    status: "pass" | "warn" | "fail";
    explanation: string;
    recommendedRecord: string;
  };
  dmarc: {
    present: boolean;
    record: string | null;
    policy: "reject" | "quarantine" | "none" | "missing";
    status: "pass" | "warn" | "fail";
    explanation: string;
    recommendedRecord: string;
  };
  caa: {
    present: boolean;
    records: string[];
    status: "pass" | "warn";
    explanation: string;
    recommendedRecord: string;
  };
  mxCount: number;
}

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export async function runEmailDnsAudit(rawDomain: string): Promise<EmailDnsAuditResult> {
  const domain = normalizeDomain(rawDomain);

  const [txtRecords, dmarcTxtRecords, caaRecords, mxRecords] = await Promise.all([
    dns.resolveTxt(domain).catch(() => [] as string[][]),
    dns.resolveTxt(`_dmarc.${domain}`).catch(() => [] as string[][]),
    dns.resolveCaa(domain).catch(() => [] as Array<{ critical: number; issue?: string; issuewild?: string; iodef?: string }>),
    dns.resolveMx(domain).catch(() => [] as Array<{ exchange: string; priority: number }>),
  ]);

  const flatTxt = txtRecords.map((chunks) => chunks.join(""));
  const spfRecord = flatTxt.find((t) => /^v=spf1\b/i.test(t.trim())) ?? null;
  const spfStrict = Boolean(spfRecord && /(?:-all|~all)\b/i.test(spfRecord));

  const flatDmarc = dmarcTxtRecords.map((chunks) => chunks.join(""));
  const dmarcRecord = flatDmarc.find((t) => /^v=DMARC1\b/i.test(t.trim())) ?? null;
  const policyMatch = dmarcRecord?.match(/\bp=(reject|quarantine|none)\b/i);
  const dmarcPolicy = (policyMatch ? policyMatch[1].toLowerCase() : dmarcRecord ? "none" : "missing") as
    | "reject"
    | "quarantine"
    | "none"
    | "missing";

  const spfStatus: "pass" | "warn" | "fail" = !spfRecord
    ? "fail"
    : spfStrict
      ? "pass"
      : "warn";

  const spfExplanation = !spfRecord
    ? "No SPF record is published. Mail servers cannot verify which systems are allowed to send email for your domain."
    : spfStrict
      ? "SPF is published and restricts unauthorized senders."
      : "SPF exists, but it does not end with -all or ~all, so spoofed senders may still pass.";

  const dmarcStatus: "pass" | "warn" | "fail" =
    dmarcPolicy === "reject" || dmarcPolicy === "quarantine"
      ? "pass"
      : dmarcPolicy === "none"
        ? "warn"
        : "fail";

  const dmarcExplanation =
    dmarcPolicy === "reject"
      ? "DMARC is set to reject. Fake emails pretending to come from your domain are blocked by inbox providers."
      : dmarcPolicy === "quarantine"
        ? "DMARC is set to quarantine. Suspicious spoofed emails are sent to spam."
        : dmarcPolicy === "none"
          ? "DMARC is in monitor-only mode (p=none). It logs spoofed emails but does not block them yet."
          : "No DMARC record is published. Attackers can send fake invoices or phishing emails pretending to be your domain.";

  const formattedCaa = caaRecords.map((r) =>
    r.issue ? `issue "${r.issue}"` : r.issuewild ? `issuewild "${r.issuewild}"` : r.iodef ? `iodef "${r.iodef}"` : "CAA rule",
  );
  const caaPresent = formattedCaa.length > 0;

  let overallStatus: "protected" | "partial" | "vulnerable" = "protected";
  if (spfStatus === "fail" || dmarcStatus === "fail") {
    overallStatus = spfStatus === "fail" && dmarcStatus === "fail" ? "vulnerable" : "partial";
  } else if (spfStatus === "warn" || dmarcStatus === "warn") {
    overallStatus = "partial";
  }

  const summary =
    overallStatus === "protected"
      ? `${domain} has strong SPF and DMARC protections against email spoofing.`
      : overallStatus === "partial"
        ? `${domain} has partial email protection, but tightening SPF or DMARC will better stop fake emails.`
        : `${domain} is missing core SPF and DMARC records, making it easy for scammers to spoof emails from your domain.`;

  return {
    domain,
    checkedAt: new Date().toISOString(),
    overallStatus,
    summary,
    spf: {
      present: Boolean(spfRecord),
      record: spfRecord,
      strict: spfStrict,
      status: spfStatus,
      explanation: spfExplanation,
      recommendedRecord: `TXT @ "v=spf1 include:_spf.google.com ~all"`,
    },
    dmarc: {
      present: Boolean(dmarcRecord),
      record: dmarcRecord,
      policy: dmarcPolicy,
      status: dmarcStatus,
      explanation: dmarcExplanation,
      recommendedRecord: `TXT _dmarc.${domain} "v=DMARC1; p=quarantine; rua=mailto:security@${domain}; pct=100"`,
    },
    caa: {
      present: caaPresent,
      records: formattedCaa,
      status: caaPresent ? "pass" : "warn",
      explanation: caaPresent
        ? "CAA records restrict which certificate authorities can issue SSL certificates for your domain."
        : "No CAA record found. Adding one prevents unauthorized SSL certificate issuance.",
      recommendedRecord: `CAA @ 0 issue "letsencrypt.org"`,
    },
    mxCount: mxRecords.length,
  };
}
