import type { MitreMapping } from "./types";

/**
 * MITRE ATT&CK mapping for scanner output.
 *
 * Design rule: **return null rather than guess.** A wrong technique ID is worse
 * than none — it flows into the client's ATT&CK heat map, skews their coverage
 * metrics, and is the sort of error that quietly survives three report cycles
 * because nobody re-derives it. `null` renders as "unmapped" and gets a human
 * decision; `T1190` on a finding that is really credential access does not.
 *
 * Scope caveat worth stating in reports: ATT&CK describes *adversary behaviour*
 * observed in intrusions. A vulnerability scanner reports *conditions*. The
 * honest mapping is therefore "the technique this weakness would enable", not
 * "the technique we observed", and every entry below should be read that way.
 */

interface TechniqueDefinition {
  readonly id: string;
  readonly tactic: string;
  readonly technique: string;
}

/** Techniques referenced by the tag table. Kept separate so IDs stay consistent. */
const TECHNIQUES = {
  exploitPublicFacing: {
    id: "T1190",
    tactic: "Initial Access",
    technique: "Exploit Public-Facing Application",
  },
  javascript: {
    id: "T1059.007",
    tactic: "Execution",
    technique: "Command and Scripting Interpreter: JavaScript",
  },
  fileDiscovery: {
    id: "T1083",
    tactic: "Discovery",
    technique: "File and Directory Discovery",
  },
  proxy: {
    id: "T1090",
    tactic: "Command and Control",
    technique: "Proxy",
  },
  validAccounts: {
    id: "T1078",
    tactic: "Initial Access",
    technique: "Valid Accounts",
  },
  gatherHostInfo: {
    id: "T1592",
    tactic: "Reconnaissance",
    technique: "Gather Victim Host Information",
  },
  compromiseInfrastructure: {
    id: "T1584",
    tactic: "Resource Development",
    technique: "Compromise Infrastructure",
  },
  bruteForce: {
    id: "T1110",
    tactic: "Credential Access",
    technique: "Brute Force",
  },
  unsecuredCredentials: {
    id: "T1552",
    tactic: "Credential Access",
    technique: "Unsecured Credentials",
  },
  adversaryInTheMiddle: {
    id: "T1557",
    tactic: "Collection",
    technique: "Adversary-in-the-Middle",
  },
  externalRemoteServices: {
    id: "T1133",
    tactic: "Initial Access",
    technique: "External Remote Services",
  },
  activeScanning: {
    id: "T1595",
    tactic: "Reconnaissance",
    technique: "Active Scanning",
  },
  exploitRemoteServices: {
    id: "T1210",
    tactic: "Lateral Movement",
    technique: "Exploitation of Remote Services",
  },
  gatherIdentityInfo: {
    id: "T1589",
    tactic: "Reconnaissance",
    technique: "Gather Victim Identity Information",
  },
} as const satisfies Record<string, TechniqueDefinition>;

/**
 * Signal → technique. Keys are matched against nuclei tags, template IDs and
 * category strings, all lower-cased.
 *
 * Order is not significant for exact hits, but it is for substring fallback:
 * longer, more specific keys are tried first (see `matchSignal`), so
 * `subdomain-takeover` cannot be shadowed by a bare `takeover`.
 */
const TAG_MAP: Readonly<Record<string, TechniqueDefinition>> = Object.freeze({
  // --- Injection and remote execution -------------------------------------
  sqli: TECHNIQUES.exploitPublicFacing,
  "sql-injection": TECHNIQUES.exploitPublicFacing,
  blindsqli: TECHNIQUES.exploitPublicFacing,
  injection: TECHNIQUES.exploitPublicFacing,
  rce: TECHNIQUES.exploitPublicFacing,
  "remote-code-execution": TECHNIQUES.exploitPublicFacing,
  ssti: TECHNIQUES.exploitPublicFacing,
  deserialization: TECHNIQUES.exploitPublicFacing,
  "command-injection": TECHNIQUES.exploitPublicFacing,
  xxe: TECHNIQUES.exploitPublicFacing,
  fileupload: TECHNIQUES.exploitPublicFacing,
  "auth-bypass": TECHNIQUES.exploitPublicFacing,
  "exposed-panel": TECHNIQUES.exploitPublicFacing,
  panel: TECHNIQUES.exploitPublicFacing,
  cve: TECHNIQUES.exploitPublicFacing,

  // --- Client-side execution ----------------------------------------------
  // XSS is JavaScript execution in a victim's browser, not exploitation of the
  // server — hence Execution rather than Initial Access.
  xss: TECHNIQUES.javascript,
  "cross-site-scripting": TECHNIQUES.javascript,
  dom: TECHNIQUES.javascript,

  // --- Information disclosure ---------------------------------------------
  lfi: TECHNIQUES.fileDiscovery,
  "file-inclusion": TECHNIQUES.fileDiscovery,
  "path-traversal": TECHNIQUES.fileDiscovery,
  traversal: TECHNIQUES.fileDiscovery,
  disclosure: TECHNIQUES.fileDiscovery,
  "files": TECHNIQUES.fileDiscovery,
  backup: TECHNIQUES.fileDiscovery,
  listing: TECHNIQUES.fileDiscovery,

  // --- Request forgery -----------------------------------------------------
  // SSRF makes the target relay traffic on the attacker's behalf: T1090 Proxy.
  ssrf: TECHNIQUES.proxy,
  "open-redirect": TECHNIQUES.proxy,
  redirect: TECHNIQUES.proxy,

  // --- Credentials ---------------------------------------------------------
  "default-login": TECHNIQUES.validAccounts,
  "default-credentials": TECHNIQUES.validAccounts,
  "weak-creds": TECHNIQUES.validAccounts,
  "weak-credentials": TECHNIQUES.validAccounts,
  defaultlogin: TECHNIQUES.validAccounts,
  creds: TECHNIQUES.validAccounts,
  bruteforce: TECHNIQUES.bruteForce,
  "token": TECHNIQUES.unsecuredCredentials,
  "exposed-token": TECHNIQUES.unsecuredCredentials,
  "api-key": TECHNIQUES.unsecuredCredentials,
  secret: TECHNIQUES.unsecuredCredentials,
  "exposure": TECHNIQUES.unsecuredCredentials,

  // --- Configuration and fingerprinting ------------------------------------
  misconfig: TECHNIQUES.gatherHostInfo,
  misconfiguration: TECHNIQUES.gatherHostInfo,
  "security-headers": TECHNIQUES.gatherHostInfo,
  headers: TECHNIQUES.gatherHostInfo,
  tech: TECHNIQUES.gatherHostInfo,
  detect: TECHNIQUES.gatherHostInfo,
  fingerprint: TECHNIQUES.gatherHostInfo,
  version: TECHNIQUES.gatherHostInfo,
  network: TECHNIQUES.activeScanning,
  "service-detection": TECHNIQUES.activeScanning,

  // --- Infrastructure ------------------------------------------------------
  "subdomain-takeover": TECHNIQUES.compromiseInfrastructure,
  takeover: TECHNIQUES.compromiseInfrastructure,
  dns: TECHNIQUES.compromiseInfrastructure,

  // --- Transport -----------------------------------------------------------
  ssl: TECHNIQUES.adversaryInTheMiddle,
  tls: TECHNIQUES.adversaryInTheMiddle,
  "weak-cipher": TECHNIQUES.adversaryInTheMiddle,

  // --- Remote services -----------------------------------------------------
  rdp: TECHNIQUES.externalRemoteServices,
  vpn: TECHNIQUES.externalRemoteServices,
  ssh: TECHNIQUES.externalRemoteServices,
  smb: TECHNIQUES.exploitRemoteServices,
  ftp: TECHNIQUES.externalRemoteServices,
  telnet: TECHNIQUES.externalRemoteServices,

  // --- Data exposure -------------------------------------------------------
  "email-disclosure": TECHNIQUES.gatherIdentityInfo,
  "user-enumeration": TECHNIQUES.gatherIdentityInfo,
});

/** Keys sorted longest-first so specific tags win over their own substrings. */
const SORTED_KEYS: readonly string[] = Object.keys(TAG_MAP).sort(
  (a, b) => b.length - a.length,
);

function normalise(signal: string): string {
  return signal.toLowerCase().trim();
}

/**
 * Resolve one signal (a tag, template ID or category) to a technique.
 *
 * Exact match first; only then a substring match, and only for signals long
 * enough that a substring hit means something. Three characters is the floor
 * because `dns` and `xss` are real tags but a two-character fragment matching
 * inside an unrelated template ID is coincidence, not evidence.
 */
function matchSignal(signal: string): TechniqueDefinition | null {
  const key = normalise(signal);
  if (key.length === 0) return null;

  const exact = TAG_MAP[key];
  if (exact) return exact;

  for (const candidate of SORTED_KEYS) {
    if (candidate.length >= 3 && key.includes(candidate)) {
      return TAG_MAP[candidate]!;
    }
  }
  return null;
}

/**
 * Map a finding's signals to a MITRE ATT&CK technique.
 *
 * Pass everything you have — nuclei tags, the template ID, the template's
 * directory category. The first signal that resolves wins, so order the array
 * most-specific-first (tags before template ID before category).
 *
 * @returns the mapping, or `null` when nothing matched. Never a fallback.
 */
export function mapToMitre(signals: readonly string[]): MitreMapping | null {
  if (!Array.isArray(signals)) return null;

  for (const signal of signals) {
    if (typeof signal !== "string") continue;
    const hit = matchSignal(signal);
    if (hit) return { id: hit.id, tactic: hit.tactic, technique: hit.technique };
  }
  return null;
}

/**
 * Map an nmap service/port observation.
 *
 * Separate from `mapToMitre` because the signal quality is different: an open
 * port is a reconnaissance-grade observation, and mapping every one of them to
 * an Initial Access technique would inflate the client's ATT&CK coverage with
 * findings that describe no adversary behaviour at all. Only services that are
 * themselves a recognised entry path get a technique.
 */
export function mapServiceToMitre(
  serviceName: string | null,
  port: number,
): MitreMapping | null {
  const remoteAccessPorts = new Set([22, 23, 3389, 5900, 1194]);
  if (remoteAccessPorts.has(port)) {
    const t = TECHNIQUES.externalRemoteServices;
    return { id: t.id, tactic: t.tactic, technique: t.technique };
  }

  const lateralPorts = new Set([135, 139, 445]);
  if (lateralPorts.has(port)) {
    const t = TECHNIQUES.exploitRemoteServices;
    return { id: t.id, tactic: t.tactic, technique: t.technique };
  }

  if (serviceName) {
    return mapToMitre([serviceName]);
  }
  return null;
}

/** Every technique this package can emit — for building ATT&CK coverage views. */
export function knownTechniques(): readonly MitreMapping[] {
  const seen = new Map<string, MitreMapping>();
  for (const t of Object.values(TECHNIQUES)) {
    seen.set(t.id, { id: t.id, tactic: t.tactic, technique: t.technique });
  }
  return [...seen.values()];
}
