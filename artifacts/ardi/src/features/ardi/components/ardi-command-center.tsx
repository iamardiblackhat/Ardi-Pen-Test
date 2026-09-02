import { FileSearch2, FileText, Network, Radar, ShieldCheck } from 'lucide-react';
import { useLocation } from 'wouter';
import { PenTestCommand } from '@/features/ardi/components/pen-test-command';
import { routes } from '@/shared/config/routes';

const commands = [
  { label: 'Authorised scope', detail: 'Add or review approved targets', href: routes.assets, icon: ShieldCheck },
  { label: 'Findings', detail: 'Review evidence and remediation', href: routes.findings, icon: FileSearch2 },
  { label: 'OSINT', detail: 'Research live public-domain signals', href: routes.osint, icon: Radar },
  { label: 'MITRE ATT&CK', detail: 'Map findings to techniques', href: routes.mitre, icon: Network },
  { label: 'Reports', detail: 'Generate assessment output', href: routes.reports, icon: FileText },
];

export function ArdiCommandCenter({ authenticated, onClose }: { authenticated: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  if (!authenticated) return <div className="p-5 text-sm leading-6 text-indigo-100/75">Sign in to let ARDI work with your approved targets, scans, findings, OSINT, MITRE mappings, and reports.</div>;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PenTestCommand onComplete={onClose} />
      <nav className="grid gap-2 border-t border-violet-200/15 p-5" aria-label="ARDI site commands">
        <p className="mb-1 font-mono text-[11px] tracking-[.16em] text-cyan-200">OPEN SECURITY ROUTE</p>
        {commands.map((command) => { const Icon = command.icon; return <button key={command.href} type="button" onClick={() => { onClose(); navigate(command.href); }} className="flex min-h-14 items-center gap-3 rounded-xl border border-violet-200/15 bg-white/[.035] px-4 text-left transition hover:border-cyan-200/55 hover:bg-violet-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Icon className="h-5 w-5 flex-none text-cyan-200" /><span><b className="block text-sm text-white">{command.label}</b><small className="text-xs text-indigo-100/60">{command.detail}</small></span></button>; })}
      </nav>
    </div>
  );
}

