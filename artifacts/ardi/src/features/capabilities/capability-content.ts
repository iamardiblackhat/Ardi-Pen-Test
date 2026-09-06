import {
  Binoculars,
  Crosshair,
  FileCheck2,
  FileSearch2,
  Globe2,
  Network,
  Radar,
  type LucideIcon,
} from "lucide-react";
import { routes } from "@/shared/config/routes";

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
    id: "open-source-investigations",
    code: "01",
    label: "People and company research",
    title: "Find public information about a person or company.",
    summary:
      "Ask ARDI to research a person, company, or event online. Get a summary with links you can check, including where sources disagree or information is missing.",
    outcomes: [
      "Search public websites",
      "Compare what different sources say",
      "Open the original sources",
      "Focus on the UK, Europe, or worldwide",
    ],
    coverage: "Available through ARDI chat",
    workspaceHref: routes.dashboard,
    icon: Binoculars,
  },
  {
    id: "domain-infrastructure",
    code: "02",
    label: "Website research",
    title: "Look up a website’s registration and connections.",
    summary:
      "Enter a website address to look up its public registration details, server addresses, email settings, and security certificates. Some details may be private or unavailable.",
    outcomes: [
      "See registration dates",
      "Find server addresses",
      "Check email settings",
      "Look up security certificates",
    ],
    coverage: "Available through ARDI chat",
    workspaceHref: routes.osint,
    icon: Globe2,
  },
  {
    id: "attack-surface",
    code: "03",
    label: "Check what is exposed online",
    title: "See which parts of your system are reachable online.",
    summary:
      "Choose a website, server, or network you have permission to test. ARDI checks what can be reached and identifies software where it can.",
    outcomes: [
      "Find reachable services",
      "Identify software and versions",
      "See what each check found",
      "Keep a record of the test",
    ],
    coverage: "Only test systems you have permission to check",
    workspaceHref: routes.scans,
    icon: Crosshair,
  },
  {
    id: "vulnerability-validation",
    code: "04",
    label: "Security testing",
    title: "Check your website or server for security weaknesses.",
    summary:
      "Run automated security tests on systems you have permission to test. Review the problems found, how serious they are, and advice on fixing them.",
    outcomes: [
      "Run security checks",
      "See how serious each problem is",
      "Read suggested fixes",
      "Review the test results",
    ],
    coverage: "Only test systems you have permission to check",
    workspaceHref: routes.findings,
    icon: FileSearch2,
  },
  {
    id: "threat-context",
    code: "05",
    label: "Threat intelligence",
    title: "Look up known cyberattacks and the groups behind them.",
    summary:
      "Search the connected collection for known attack groups, malicious software, and attack methods. See the records available and use them to understand a threat.",
    outcomes: [
      "Research known attack groups",
      "Look up malicious software",
      "Understand common attack methods",
      "Search the available records",
    ],
    coverage: "Connected threat records",
    workspaceHref: routes.intelligence,
    icon: Radar,
  },
  {
    id: "attack-context",
    code: "06",
    label: "Understand your security results",
    title: "Understand how a security weakness could be used.",
    summary:
      "Review the attack methods linked to your test results. Understand what a finding means and which protections may help.",
    outcomes: [
      "Explain findings in context",
      "See related attack methods",
      "Review the supporting results",
      "Understand where protection is needed",
    ],
    coverage: "Based on your test results",
    workspaceHref: routes.mitre,
    icon: Network,
  },
  {
    id: "evidence-reporting",
    code: "07",
    label: "Results and reports",
    title: "Turn your test results into a report you can share.",
    summary:
      "Review completed tests, track which problems have been fixed, and ask ARDI to create a report for your team or management.",
    outcomes: [
      "Review problems found",
      "Track fixes",
      "Create detailed reports or summaries",
      "Ask ARDI to prepare a report",
    ],
    coverage: "Based on your completed tests",
    workspaceHref: routes.reports,
    icon: FileCheck2,
  },
];
