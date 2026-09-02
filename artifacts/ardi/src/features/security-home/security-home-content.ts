import {
  Crosshair,
  FileSearch2,
  FileText,
  Network,
  Radar,
  ScanSearch,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '@/shared/config/routes';

export type SecurityRoute = {
  code: string;
  label: string;
  title: string;
  body: string;
  href: string;
  icon: LucideIcon;
  emphasis?: 'primary' | 'standard';
};

export const primaryNavigation = [
  { id: 'pen-testing', label: 'Pen Testing' },
  { id: 'security-tools', label: 'Security Tools' },
  { id: 'assistant', label: 'ARDI' },
] as const;

export const heroScenes = [
  {
    id: 'pen-test',
    label: 'Pen Test',
    detail: 'Test an authorised target',
    src: '/ardi/media/ardi-security-hero.mp4',
    poster: '/ardi/media/ardi-security-hero-poster.png',
  },
  {
    id: 'assessment',
    label: 'Assessment',
    detail: 'Run the controlled workflow',
    src: '/ardi/media/ardi-assessment.mp4',
    poster: '/ardi/media/ardi-security-hero-poster.png',
  },
  {
    id: 'evidence',
    label: 'Evidence',
    detail: 'Review verified findings',
    src: '/ardi/media/ardi-evidence.mp4',
    poster: '/ardi/media/ardi-security-hero-poster.png',
  },
] as const;

export const securityRoutes: SecurityRoute[] = [
  {
    code: '01',
    label: 'Pen Testing',
    title: 'Run an authorised Pen Test',
    body: 'Create, start, follow, and stop a real assessment against an approved asset.',
    href: routes.scans,
    icon: Crosshair,
    emphasis: 'primary',
  },
  {
    code: '02',
    label: 'Scope',
    title: 'Define approved targets',
    body: 'Register the domains, APIs, networks, and cloud systems you are authorised to assess.',
    href: routes.assets,
    icon: ShieldCheck,
  },
  {
    code: '03',
    label: 'Findings',
    title: 'Work the evidence',
    body: 'Review scanner evidence, severity, remediation, CVE, and MITRE mappings.',
    href: routes.findings,
    icon: FileSearch2,
  },
  {
    code: '04',
    label: 'OSINT',
    title: 'Research public signals',
    body: 'Investigate live RDAP, DNS, and certificate-transparency data for a public domain.',
    href: routes.osint,
    icon: Radar,
  },
  {
    code: '05',
    label: 'MITRE ATT&CK',
    title: 'Map attack techniques',
    body: 'See how verified findings connect to tactics and techniques used by real adversaries.',
    href: routes.mitre,
    icon: Network,
  },
  {
    code: '06',
    label: 'Reports',
    title: 'Package the result',
    body: 'Generate assessment output from real assets, scans, findings, and evidence.',
    href: routes.reports,
    icon: FileText,
  },
];
