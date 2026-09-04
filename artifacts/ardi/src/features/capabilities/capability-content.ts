import {
  Binoculars,
  Crosshair,
  FileCheck2,
  FileSearch2,
  Globe2,
  Network,
  Radar,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '@/shared/config/routes';

export type PublicCapability = {
  id: string;
  code: string;
  label: string;
  title: string;
  summary: string;
  outcomes: string[];
  coverage: string;
  workspaceHref: string;
  icon: LucideIcon;
};

export const publicCapabilities: PublicCapability[] = [
  {
    id: 'open-source-investigations',
    code: '01',
    label: 'Open-source investigations',
    title: 'Build a sourced picture from the public internet.',
    summary: 'Investigate a person, organisation, incident, threat, or exposed digital trail across current public sources. ARDI compares evidence, separates fact from inference, and returns the source trail.',
    outcomes: ['Current multi-source research', 'Corroborated facts and conflicts', 'Direct evidence links', 'UK, European, or global focus'],
    coverage: 'Live in ARDI',
    workspaceHref: routes.dashboard,
    icon: Binoculars,
  },
  {
    id: 'domain-infrastructure',
    code: '02',
    label: 'Domain intelligence',
    title: 'Map the infrastructure behind a public domain.',
    summary: 'Pull live registration, DNS, mail-routing, nameserver, address, and certificate evidence into one investigation instead of checking disconnected lookup sites.',
    outcomes: ['Registration timeline', 'Address and mail infrastructure', 'Nameserver relationships', 'Certificate history and names'],
    coverage: 'Live in ARDI',
    workspaceHref: routes.osint,
    icon: Globe2,
  },
  {
    id: 'attack-surface',
    code: '03',
    label: 'Attack-surface assessment',
    title: 'See what an approved system exposes to attackers.',
    summary: 'Assess a website, API, host, or network already added to your authorised scope. ARDI identifies reachable services, fingerprints versions, and records the evidence.',
    outcomes: ['Live service discovery', 'Technology and version fingerprinting', 'Exposed-port evidence', 'Controlled, auditable execution'],
    coverage: 'Authorised targets only',
    workspaceHref: routes.scans,
    icon: Crosshair,
  },
  {
    id: 'vulnerability-validation',
    code: '04',
    label: 'Vulnerability validation',
    title: 'Turn exposed technology into verified security findings.',
    summary: 'Run active checks against the approved target, retain what the assessment observed, and distinguish supported findings from assumptions or generic advice.',
    outcomes: ['Active vulnerability checks', 'Severity and remediation', 'CVE references where present', 'Captured technical evidence'],
    coverage: 'Authorised targets only',
    workspaceHref: routes.findings,
    icon: FileSearch2,
  },
  {
    id: 'threat-context',
    code: '05',
    label: 'Threat intelligence',
    title: 'Search the campaigns, actors, malware, and techniques behind real attacks.',
    summary: 'Use a live connected intelligence workspace to investigate known threats, track their relationships, and add current context to security decisions.',
    outcomes: ['Live campaign and actor records', 'Malware and indicator research', 'Attack-technique context', 'Searchable source intelligence'],
    coverage: 'Live connected intelligence',
    workspaceHref: routes.intelligence,
    icon: Radar,
  },
  {
    id: 'attack-context',
    code: '06',
    label: 'Attack-path context',
    title: 'Connect verified findings to how attacks unfold.',
    summary: 'Translate verified findings into attack tactics and techniques, so teams can understand likely paths and prioritise controls that interrupt them.',
    outcomes: ['Attack-technique mapping', 'Tactic-level coverage', 'Evidence-linked context', 'Priority without inflated claims'],
    coverage: 'Built from verified findings',
    workspaceHref: routes.mitre,
    icon: Network,
  },
  {
    id: 'evidence-reporting',
    code: '07',
    label: 'Evidence and reporting',
    title: 'Move from investigation to a defensible result.',
    summary: 'Review the real work, preserve the evidence, track remediation, and generate a technical or executive report from the assessment data already in your workspace.',
    outcomes: ['Findings and evidence review', 'Remediation tracking', 'Technical and executive output', 'Report generation through ARDI'],
    coverage: 'Generated from workspace data',
    workspaceHref: routes.reports,
    icon: FileCheck2,
  },
];
