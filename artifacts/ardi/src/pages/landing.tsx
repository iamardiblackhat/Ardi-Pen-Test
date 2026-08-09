import { useState } from 'react';
import { Link } from 'wouter';
import {
  Shield, Zap, Lock, BarChart3, Globe, Clock, CheckCircle2, ArrowRight,
  Server, Cloud, Smartphone, Radar, Target, FileCheck2, Terminal, LayoutGrid, GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion } from 'framer-motion';
import { ArdiAvatar } from '@/components/ardi-avatar';
import { ArdiPanel } from '@/components/ardi-panel';

/** Small-caps mono label used as a structural device throughout — real section
    identity, not decoration. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
      {children}
    </div>
  );
}

function GlowButton({ children, variant = 'solid' }: { children: React.ReactNode; variant?: 'solid' | 'outline' }) {
  const base = 'relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-sm font-medium tracking-tight transition-all';
  if (variant === 'outline') {
    return (
      <span className={`${base} border border-primary/40 bg-primary/5 text-primary glow-primary hover:bg-primary/10 hover:glow-primary-strong`}>
        {children}
      </span>
    );
  }
  return (
    <span className={`${base} bg-primary text-primary-foreground glow-primary-strong hover:brightness-110`}>
      {children}
    </span>
  );
}

const PIPELINE_STEPS = [
  { icon: Server, label: 'Asset added', detail: 'You register what you own and are authorised to test', chips: null as string[] | null },
  { icon: Radar, label: 'Scan runs', detail: 'Real tests, not simulated', chips: ['nmap', 'nuclei', 'CyberStrike'] },
  { icon: Target, label: 'Findings mapped', detail: 'Tagged against MITRE ATT&CK, never guessed', chips: null as string[] | null },
  { icon: FileCheck2, label: 'Report ready', detail: 'Severity, evidence, and the fix', chips: null as string[] | null },
];

/** The real MITRE ATT&CK Enterprise matrix — public reference data, not
    account-specific claims. One representative technique per tactic, exactly
    as published, so nothing here is invented. */
const ATTACK_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', example: 'T1595 Active Scanning' },
  { id: 'TA0042', name: 'Resource Development', example: 'T1583 Acquire Infrastructure' },
  { id: 'TA0001', name: 'Initial Access', example: 'T1190 Exploit Public-Facing Application' },
  { id: 'TA0002', name: 'Execution', example: 'T1059 Command and Scripting Interpreter' },
  { id: 'TA0003', name: 'Persistence', example: 'T1098 Account Manipulation' },
  { id: 'TA0004', name: 'Privilege Escalation', example: 'T1068 Exploitation for Privilege Escalation' },
  { id: 'TA0005', name: 'Defense Evasion', example: 'T1027 Obfuscated Files or Information' },
  { id: 'TA0006', name: 'Credential Access', example: 'T1110 Brute Force' },
  { id: 'TA0007', name: 'Discovery', example: 'T1046 Network Service Discovery' },
  { id: 'TA0008', name: 'Lateral Movement', example: 'T1021 Remote Services' },
  { id: 'TA0009', name: 'Collection', example: 'T1005 Data from Local System' },
  { id: 'TA0011', name: 'Command and Control', example: 'T1071 Application Layer Protocol' },
  { id: 'TA0010', name: 'Exfiltration', example: 'T1041 Exfiltration Over C2 Channel' },
  { id: 'TA0040', name: 'Impact', example: 'T1499 Endpoint Denial of Service' },
];

/** The signature element: a real, interactive panel — Ardi's actual pipeline
    on one tab, the real MITRE ATT&CK Enterprise matrix on the other. No
    invented numbers; the framework itself is the content. */
function ProductPanel() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<'pipeline' | 'attack'>('pipeline');
  const [activeTactic, setActiveTactic] = useState(0);

  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-[radial-gradient(ellipse_65%_65%_at_50%_40%,hsl(var(--primary)/0.25),transparent_70%)] blur-3xl pointer-events-none" />
      <div className="relative rounded-2xl border border-border bg-card/70 grid-pattern overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        {/* Tab bar — real navigation, not decoration */}
        <div className="relative flex items-center gap-1 border-b border-border px-4 pt-4">
          <button
            onClick={() => setTab('pipeline')}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-xs font-mono transition-colors ${tab === 'pipeline' ? 'bg-background text-primary border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-pipeline"
          >
            <GitBranch className="h-3.5 w-3.5" /> Pipeline
          </button>
          <button
            onClick={() => setTab('attack')}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-xs font-mono transition-colors ${tab === 'attack' ? 'bg-background text-primary border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-attack"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> MITRE ATT&CK coverage
          </button>
          <span className="ml-auto mr-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" /> live
          </span>
        </div>

        {tab === 'pipeline' ? (
          <div className="relative p-8">
            <div className="flex flex-col lg:flex-row items-stretch gap-2">
              {PIPELINE_STEPS.map((s, i) => (
                <div key={s.label} className="flex flex-1 items-center gap-2">
                  <motion.div
                    className="flex-1 rounded-xl border border-border bg-background/60 p-5"
                    initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: reduce ? 0 : 0.1 * i, duration: 0.4 }}
                    whileHover={reduce ? undefined : { y: -3, borderColor: 'hsl(var(--primary) / 0.5)' }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_16px_-4px] shadow-primary/60 mb-3">
                      <s.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <p className="font-mono text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
                    {s.chips && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {s.chips.map((c) => (
                          <span key={c} className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{c}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className="hidden lg:block h-4 w-4 text-primary/40 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative p-8">
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              The published MITRE ATT&CK® Enterprise tactics — click one to see a technique Ardi tests for.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
              {ATTACK_TACTICS.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTactic(i)}
                  className={`rounded-lg border px-2 py-3 text-center transition-colors ${i === activeTactic ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
                  data-testid={`tactic-${t.id}`}
                >
                  <p className="font-mono text-[9px] opacity-70">{t.id}</p>
                  <p className="text-[11px] font-medium leading-tight mt-1">{t.name}</p>
                </button>
              ))}
            </div>
            <motion.div
              key={activeTactic}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4 flex items-center gap-3"
            >
              <Target className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{ATTACK_TACTICS[activeTactic].name} · example technique</p>
                <p className="font-mono text-sm text-foreground">{ATTACK_TACTICS[activeTactic].example}</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: 'Scans that run on their own',
    desc: 'Ardi picks the tests that suit each system it is pointed at and runs them without anyone having to start the job.',
    more: 'Powered by nmap and nuclei by default. If you configure CyberStrike, Ardi hands the scan to that engine instead for deeper, AI-driven testing.',
  },
  {
    icon: BarChart3,
    title: 'MITRE ATT&CK mapping',
    desc: 'MITRE ATT&CK is the public catalogue of the methods real attackers use. Ardi tags each finding against it, so you can see which methods you have tested for and which you have not.',
    more: 'Covers the full Enterprise matrix — 14 tactics, hundreds of techniques — so a gap in coverage is visible, not just a list of alerts.',
  },
  {
    icon: Lock,
    title: 'Evidence for compliance work',
    desc: 'Findings are mapped to the technical controls in ISO 27001, SOC 2, PCI-DSS and HIPAA, and can be exported when an auditor asks what testing you do.',
    more: 'Each control links back to the specific finding that satisfies or fails it, with a timestamp — the trail an auditor actually asks for.',
  },
  {
    icon: Globe,
    title: 'One place for every system',
    desc: 'Websites, APIs, internal networks, cloud accounts on AWS, Azure or GCP, and mobile apps are all tested and tracked from the same account.',
    more: 'Add a domain or a cloud account once. Ardi keeps discovering new endpoints on every scan, not just the first one.',
  },
  {
    icon: Clock,
    title: 'Alerts where you already work',
    desc: 'Critical findings can be sent to Slack, PagerDuty or Jira, so the right person sees them without logging into another tool.',
    more: 'You set the severity threshold per channel — nobody gets paged at 3am for a low-severity finding.',
  },
  {
    icon: Server,
    title: 'Asset discovery',
    desc: 'Point Ardi at a domain or cloud account and it catalogues the subdomains, services and endpoints it can reach, including ones nobody remembered were running.',
    more: 'Subdomain enumeration, port scanning and service fingerprinting run automatically the moment you add a domain — no separate discovery step.',
  },
];

/** Cards that are actually cards: click one and it opens to show more, rather
    than sitting there decoratively. */
function FeatureGrid({ reduce }: { reduce: boolean | null }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {FEATURES.map((f, i) => {
        const isOpen = open === i;
        return (
          <motion.button
            key={f.title}
            onClick={() => setOpen(isOpen ? null : i)}
            className={`group text-left rounded-xl border bg-card/40 p-6 transition-colors ${isOpen ? 'border-primary/60 bg-card/70' : 'border-border hover:border-primary/40 hover:bg-card/70'}`}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: reduce ? 0 : 0.05 * i, duration: 0.4 }}
            whileHover={reduce ? undefined : { y: -3 }}
            aria-expanded={isOpen}
            data-testid={`feature-card-${i}`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 transition-colors ${isOpen ? 'border-primary/60 bg-primary/15' : 'border-primary/30 bg-primary/10 group-hover:border-primary/60'}`}>
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <span className={`font-mono text-xs text-muted-foreground transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </div>
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            {isOpen && (
              <motion.p
                initial={reduce ? { opacity: 1 } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-sm text-primary/90 leading-relaxed mt-3 pt-3 border-t border-border font-mono text-xs"
              >
                {f.more}
              </motion.p>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function Landing() {
  const [ardiOpen, setArdiOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary/40 bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Ardi</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/register" data-testid="button-get-started-header">
              <GlowButton variant="outline">Get started</GlowButton>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.28),transparent_65%)]" />
        <div className="absolute inset-0 grid-pattern opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="container relative mx-auto px-6 pt-20 lg:pt-28 pb-16">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center"><Eyebrow>Autonomous penetration testing</Eyebrow></div>
            <h1 className="mt-6 text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Penetration testing
              <br />
              that runs itself
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              A penetration test is a controlled attempt to break into your own systems, so you find the weaknesses before someone else does. Ardi does that work automatically, on a schedule you set, and reports what it found and how to fix it.
            </p>
            <div className="mt-10 flex justify-center">
              <Link href="/register" data-testid="button-start-free-trial">
                <GlowButton>Start free trial <ArrowRight className="w-4 h-4" /></GlowButton>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> MITRE ATT&CK mapped</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Real nmap + nuclei scans</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> OWASP Top 10</span>
            </div>
          </motion.div>

          <motion.div
            className="mt-16 max-w-5xl mx-auto"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <ProductPanel />
          </motion.div>
        </div>
      </section>

      {/* Manual vs Automated */}
      <section className="container mx-auto px-6 py-24">
        <Eyebrow>The comparison</Eyebrow>
        <h2 className="mt-4 text-3xl lg:text-4xl font-bold max-w-2xl">How this compares to hiring a testing firm</h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Most organisations buy a penetration test as a one-off consulting project. Ardi is built to run the same kind of testing continuously.
        </p>
        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card/40 p-8">
            <h3 className="font-mono text-sm uppercase tracking-wide text-muted-foreground mb-6">A consultant-led engagement</h3>
            <ul className="space-y-4">
              {[
                'Runs once per quarter or year',
                'Takes weeks to schedule and execute',
                'Typically £4,000-20,000 per engagement',
                'Point-in-time snapshot only',
                'Limited to consultant availability',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-severity-critical/15 border border-severity-critical/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-severity-critical text-xs">✕</span>
                  </div>
                  <span className="text-muted-foreground text-sm">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/[0.04] p-8 glow-primary">
            <h3 className="font-mono text-sm uppercase tracking-wide text-primary mb-6">Ardi</h3>
            <ul className="space-y-4">
              {[
                'Runs on a schedule you set, not once a year',
                'Testing begins once you add an asset',
                'Free for one system, then from £49 a month',
                'Findings appear as soon as a scan completes',
                'Covers every asset you add, not a fixed scope',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-foreground text-sm">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <Eyebrow>Capabilities</Eyebrow>
          <h2 className="mt-4 text-3xl lg:text-4xl font-bold">What Ardi does</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ardi looks for weaknesses in the systems your business runs on, explains what it found in plain language, and keeps a record you can hand to an auditor or a developer.
          </p>
        </div>
        <FeatureGrid reduce={reduce} />
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <Eyebrow>Process</Eyebrow>
          <h2 className="mt-4 text-3xl lg:text-4xl font-bold">How it works</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three steps, from adding your first system to reading the results.
          </p>
        </div>
        <div className="mt-16 grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center font-mono text-sm font-bold text-primary">1</div>
              <h3 className="text-2xl font-bold">Add your systems</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Tell Ardi which websites, networks, cloud accounts and APIs belong to you. It then maps out the subdomains, services and endpoints attached to them. There is no software to install on your servers.
            </p>
            <div className="flex flex-wrap gap-2">
              {[[Globe, 'Websites'], [Server, 'Networks'], [Cloud, 'Cloud accounts'], [Smartphone, 'Mobile apps']].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-2 px-3 py-1.5 bg-card/60 border border-border rounded-md text-xs font-mono">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  {label as string}
                </div>
              ))}
            </div>
          </div>
          {/* A real form, not a terminal — most people adding a system here
              have never used a CLI and shouldn't need to. */}
          <div className="relative rounded-xl border border-border bg-card/60 p-6 grid-pattern">
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wide">Add asset</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <div className="mt-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm">Production API</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <div className="mt-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm flex items-center justify-between">
                  <span>API</span>
                  <span className="text-muted-foreground text-xs">▾</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Target</label>
                <div className="mt-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground">https://api.example.com</div>
              </div>
            </div>
            <div className="mt-4 rounded-md bg-primary text-primary-foreground text-center py-2 text-sm font-medium glow-primary">
              Add asset
            </div>
            <p className="mt-3 text-xs text-muted-foreground">No software to install. Ardi discovers what's reachable from the target you give it.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="order-2 lg:order-1 relative rounded-xl border border-border bg-card/60 p-6 grid-pattern min-h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {['Web App', 'Network', 'Cloud AWS', 'API', 'Mobile', 'Database'].map((t) => (
                  <div key={t} className="bg-background/60 rounded-lg p-3 border border-primary/20 flex flex-col items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-glow" />
                    <p className="text-[10px] font-mono text-muted-foreground">{t}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs font-mono text-muted-foreground">Every system type, one account</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center font-mono text-sm font-bold text-primary">2</div>
              <h3 className="text-2xl font-bold">Ardi runs the tests</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Tests are built from published vulnerability data and the OWASP Top 10, the industry's reference list of the most common web application weaknesses. Ardi adjusts what it tries based on the technology it finds in your stack. You authorise every asset before it is tested.
            </p>
            <ul className="space-y-3">
              {[
                'OWASP Top 10 and SANS Top 25 coverage',
                'Known CVEs matched against your software versions',
                'Login and session handling checks',
                'Access control and permission checks',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center font-mono text-sm font-bold text-primary">3</div>
              <h3 className="text-2xl font-bold">You get results you can act on</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Each finding comes with a severity score, the MITRE ATT&CK technique it relates to, evidence that it is real, and the change needed to fix it. Reports export in two forms: a short summary for the board and a detailed version for whoever does the work.
            </p>
            <div className="space-y-3">
              <div className="bg-card/60 border border-border rounded-lg p-4">
                <span className="text-sm font-semibold">Ordered by what matters</span>
                <p className="text-xs text-muted-foreground mt-1">Ranked by how easily a weakness could be used and how important the affected system is</p>
              </div>
              <div className="bg-card/60 border border-border rounded-lg p-4">
                <span className="text-sm font-semibold">How to fix it</span>
                <p className="text-xs text-muted-foreground mt-1">Written for the framework and language the affected system is built in</p>
              </div>
            </div>
          </div>
          <div className="relative rounded-xl border border-severity-critical/30 bg-card/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-mono text-sm font-semibold">SQL Injection in /api/users</h4>
              <span className="px-2 py-1 bg-severity-critical/15 text-severity-critical border border-severity-critical/40 rounded text-xs font-mono font-semibold">Critical</span>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">CVSS Score:</span>
                <span className="ml-2 font-mono font-bold text-severity-critical">9.8</span>
              </div>
              <div>
                <span className="text-muted-foreground">MITRE ATT&CK:</span>
                <span className="ml-2 font-mono text-primary">T1190 · Exploit Public-Facing Application</span>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-muted-foreground mb-2">Remediation:</p>
                <div className="bg-background/60 rounded p-3 font-mono text-xs">
                  Use parameterized queries:<br />
                  <span className="text-severity-low">+ cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing
          Benchmarked against the UK automated-security-testing market
          (Intruder.io, Detectify, Probely, Pentest-Tools) rather than against
          manual pentest consultancies, which sell a different thing entirely.
          Free tier is deliberately useful, not a crippled demo: one real asset,
          really scanned. Prices exclude VAT (UK B2B convention). */}
      <section id="pricing" className="container mx-auto px-6 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center"><Eyebrow>Pricing</Eyebrow></div>
          <h2 className="mt-4 text-3xl lg:text-4xl font-bold">Pay for what you test</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A fixed monthly fee based on how many systems you want tested. Start free with one system, no card needed. Prices are in pounds and exclude VAT.
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-6xl mx-auto">
          <div className="rounded-xl border border-border bg-card/40 p-8 flex flex-col">
            <h3 className="font-mono text-sm uppercase tracking-wide mb-2">Free</h3>
            <p className="text-muted-foreground text-sm mb-6">For trying it on one system</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {['1 system', 'Monthly scan', 'Full findings, nothing held back', 'No card required'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="w-full" data-testid="button-pricing-free">
              <Button variant="outline" className="w-full">Start free</Button>
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-8 flex flex-col">
            <h3 className="font-mono text-sm uppercase tracking-wide mb-2">Starter</h3>
            <p className="text-muted-foreground text-sm mb-6">For a small business or a single product</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£49</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {['Up to 5 systems', 'Weekly scans', 'PDF reports you can hand to a client', 'Email alerts on new findings'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="w-full" data-testid="button-pricing-starter">
              <Button variant="outline" className="w-full">Get started</Button>
            </Link>
          </div>

          <div className="relative rounded-xl border border-primary/50 bg-primary/[0.04] p-8 flex flex-col glow-primary">
            <div className="absolute -top-3 left-8 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-semibold tracking-wide">MOST USED</div>
            <h3 className="font-mono text-sm uppercase tracking-wide text-primary mb-2">Professional</h3>
            <p className="text-muted-foreground text-sm mb-6">For a team that has to answer to auditors</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£199</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {['Up to 25 systems', 'Daily scans', 'Compliance mapping and evidence export', 'ARDI, the built-in security assistant', 'Slack, Jira and webhook integrations'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="w-full" data-testid="button-pricing-professional">
              <Button className="w-full glow-primary-strong">Get started</Button>
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-8 flex flex-col">
            <h3 className="font-mono text-sm uppercase tracking-wide mb-2">Enterprise</h3>
            <p className="text-muted-foreground text-sm mb-6">For large or regulated estates</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">Talk to us</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {['Unlimited systems', 'Continuous scanning', 'Run the scanner inside your own network', 'Single sign-on and audit logging', 'A named contact at Ardi'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="w-full" data-testid="button-pricing-enterprise">
              <Button variant="outline" className="w-full">Get started</Button>
            </Link>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8 font-mono">
          Pay yearly and get two months free. Change plan or cancel whenever you like.
        </p>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="relative rounded-2xl border border-primary/30 bg-card/40 p-12 text-center grid-pattern overflow-hidden glow-primary">
          <h2 className="relative text-3xl lg:text-4xl font-bold mb-4">See what Ardi finds on your systems</h2>
          <p className="relative text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Add one system on a trial and read the report it produces. If it tells you nothing you did not already know, you have lost an afternoon.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" data-testid="button-start-free-trial-cta">
              <GlowButton>Start free trial <ArrowRight className="w-4 h-4" /></GlowButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-12">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary/40 bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-bold">Ardi</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automated penetration testing, run continuously.
              </p>
            </div>
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/60 mt-12 pt-8 text-center text-sm text-muted-foreground font-mono">
            © 2026 Ardi Security. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ARDI launcher — visible on landing so visitors can ask questions before signing up */}
      <motion.button
        onClick={() => setArdiOpen(true)}
        aria-label="Chat with ARDI"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={reduce ? undefined : { scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 1.2 }}
        className="fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-ardi-surface shadow-xl ring-2 ring-ardi-neon/50"
      >
        <ArdiAvatar mood="idle" size={44} />
      </motion.button>

      <ArdiPanel
        open={ardiOpen}
        onClose={() => setArdiOpen(false)}
        authenticated={false}
        context="The user is on the Ardi public landing page and has not signed in yet. Guide them, answer questions about the product, and encourage them to register."
      />
    </div>
  );
}
