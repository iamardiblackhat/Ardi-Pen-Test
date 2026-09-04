import {
  Crosshair,
  FileCheck2,
  FileText,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";

export const onboardingSteps = [
  "Welcome",
  "Scope",
  "Authorise",
  "Running",
] as const;

export type SecurityCapability = {
  name: string;
  detail: string;
  icon: LucideIcon;
};

export const securityCapabilities: SecurityCapability[] = [
  {
    name: "Penetration testing",
    detail:
      "Test an approved website, API, host, or application and follow the assessment as it runs.",
    icon: Crosshair,
  },
  {
    name: "OSINT investigations",
    detail:
      "Research live public domain, DNS, registration, and certificate signals from one investigation surface.",
    icon: ScanSearch,
  },
  {
    name: "Findings and evidence",
    detail:
      "Ask ARDI to review real findings, explain evidence, and identify the highest-priority remediation.",
    icon: FileCheck2,
  },
  {
    name: "Security reporting",
    detail:
      "Generate assessment output from stored scans, verified findings, and approved target records.",
    icon: FileText,
  },
];
