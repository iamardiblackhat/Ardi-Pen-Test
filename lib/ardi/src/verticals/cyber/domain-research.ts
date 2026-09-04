import { resolve4, resolve6, resolveMx, resolveNs } from "node:dns/promises";
import { domainToASCII } from "node:url";

type RdataEvent = { eventAction?: string; eventDate?: string };
type RdapResponse = {
  handle?: string;
  ldhName?: string;
  status?: string[];
  events?: RdataEvent[];
};
type CertificateRecord = {
  id?: number | string;
  common_name?: string;
  issuer_name?: string;
  not_before?: string;
  not_after?: string;
  name_value?: string;
};

export type DomainResearch = {
  domain: string;
  retrievedAt: string;
  sources: { rdap: boolean; dns: boolean; certificateTransparency: boolean };
  sourceErrors: string[];
  rdap: {
    handle: string | null;
    name: string | null;
    status: string[];
    events: RdataEvent[];
  } | null;
  dns: {
    ipv4: string[];
    ipv6: string[];
    mx: Array<{ exchange: string; priority: number }>;
    ns: string[];
  };
  certificates: Array<{
    id: string | null;
    name: string | null;
    issuer: string | null;
    notBefore: string | null;
    notAfter: string | null;
  }>;
};

export function normalizePublicDomain(input: string): string {
  const domain = domainToASCII(input.trim().toLowerCase().replace(/\.$/, ""));
  const valid =
    /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!domain || !valid.test(domain))
    throw new Error("Enter a valid public domain name.");
  return domain;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    headers: { accept: "application/json", "user-agent": "ARDI-SEC/1.0" },
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}.`);
  return response.json() as Promise<T>;
}

async function dnsRecords(domain: string) {
  const safe = async <T>(query: Promise<T>): Promise<T | null> => {
    try {
      return await query;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENODATA" || code === "ENOTFOUND") return null;
      throw error;
    }
  };
  const [ipv4, ipv6, mx, ns] = await Promise.all([
    safe(resolve4(domain)),
    safe(resolve6(domain)),
    safe(resolveMx(domain)),
    safe(resolveNs(domain)),
  ]);
  return { ipv4: ipv4 ?? [], ipv6: ipv6 ?? [], mx: mx ?? [], ns: ns ?? [] };
}

export async function researchDomain(input: string): Promise<DomainResearch> {
  const domain = normalizePublicDomain(input);
  const sourceErrors: string[] = [];
  const [rdapResult, dnsResult, certificateResult] = await Promise.allSettled([
    fetchJson<RdapResponse>(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
    ),
    dnsRecords(domain),
    fetchJson<CertificateRecord[]>(
      `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
    ),
  ]);

  if (rdapResult.status === "rejected")
    sourceErrors.push("Domain registration source unavailable");
  if (dnsResult.status === "rejected")
    sourceErrors.push("DNS source unavailable");
  if (certificateResult.status === "rejected")
    sourceErrors.push("Certificate source unavailable");

  const rdap = rdapResult.status === "fulfilled" ? rdapResult.value : null;
  const certificateRows =
    certificateResult.status === "fulfilled" ? certificateResult.value : [];
  const uniqueCertificates = new Map<string, CertificateRecord>();
  for (const record of certificateRows) {
    const key = `${record.id ?? ""}:${record.common_name ?? record.name_value ?? ""}`;
    if (!uniqueCertificates.has(key)) uniqueCertificates.set(key, record);
    if (uniqueCertificates.size >= 30) break;
  }

  return {
    domain,
    retrievedAt: new Date().toISOString(),
    sources: {
      rdap: rdapResult.status === "fulfilled",
      dns: dnsResult.status === "fulfilled",
      certificateTransparency: certificateResult.status === "fulfilled",
    },
    sourceErrors,
    rdap: rdap
      ? {
          handle: rdap.handle ?? null,
          name: rdap.ldhName ?? null,
          status: rdap.status ?? [],
          events: rdap.events ?? [],
        }
      : null,
    dns:
      dnsResult.status === "fulfilled"
        ? dnsResult.value
        : { ipv4: [], ipv6: [], mx: [], ns: [] },
    certificates: [...uniqueCertificates.values()].map((record) => ({
      id: record.id === undefined ? null : String(record.id),
      name: record.common_name ?? record.name_value ?? null,
      issuer: record.issuer_name ?? null,
      notBefore: record.not_before ?? null,
      notAfter: record.not_after ?? null,
    })),
  };
}
