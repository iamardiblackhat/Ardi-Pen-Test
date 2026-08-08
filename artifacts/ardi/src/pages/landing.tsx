import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { Shield, Zap, Lock, BarChart3, Globe, Clock, CheckCircle2, ArrowRight, Server, Cloud, Smartphone, Send, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArdiAvatar, ArdiFull } from '@/components/ardi-avatar';
import type { ArdiMood } from '@/components/ardi-avatar';

const SUGGESTIONS = [
  'What does Ardi actually do?',
  'How is this different from a manual pentest?',
  'What is MITRE ATT&CK?',
  'How do I get started?',
];

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

function LandingArdiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState<ArdiMood>('idle');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, reduce]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setMood('working');
    setMessages([...next, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ardi/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          context: 'The user is on the Ardi public landing page and has not signed in yet. Guide them, answer questions about the product, and encourage them to register.',
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setMood('concerned');
        setMessages([...next, { role: 'assistant', content: err.detail ?? err.error ?? "I'm not available right now — try signing up and I'll be with you inside the app." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistant = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'text') {
            assistant += evt.text;
            setMessages([...next, { role: 'assistant', content: assistant }]);
          } else if (evt.type === 'mood') {
            setMood(evt.mood);
          } else if (evt.type === 'error') {
            setMood('concerned');
            assistant += (assistant ? '\n\n' : '') + evt.message;
            setMessages([...next, { role: 'assistant', content: assistant }]);
          }
        }
      }
    } catch {
      setMood('concerned');
      setMessages([...next, { role: 'assistant', content: 'Lost connection. Try signing up and I will be with you inside the app.' }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <motion.aside
      initial={reduce ? { opacity: 0 } : { x: '100%', opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { x: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-border bg-ardi-surface text-ardi-surface-foreground shadow-2xl"
      aria-label="ARDI assistant"
    >
      <header className="flex items-center gap-3 border-b border-white/10 p-4">
        <ArdiAvatar mood={mood} size={40} />
        <div className="flex-1">
          <p className="font-semibold leading-tight">ARDI</p>
          <p className="text-xs text-ardi-cyan">
            {streaming ? 'Thinking…' : 'Your security guide'}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close ARDI" className="rounded p-1.5 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <ArdiFull mood="idle" size={140} />
              <p className="text-sm text-ardi-surface-foreground/70">
                I'm ARDI — ask me anything about automated penetration testing or how this platform works.
              </p>
            </motion.div>
            <div className="space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.05 * i }}
                  onClick={() => void send(s)}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 p-3 text-left text-sm hover:border-ardi-neon/50 hover:bg-white/5"
                >
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-ardi-neon" />
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={m.role === 'user' ? 'flex justify-end' : 'flex gap-2'}
          >
            {m.role === 'assistant' && <ArdiAvatar mood={i === messages.length - 1 ? mood : 'idle'} size={26} className="mt-1 flex-shrink-0" />}
            <div className={m.role === 'user'
              ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-ardi-neon/15 px-3 py-2 text-sm'
              : 'max-w-[85%] text-sm leading-relaxed'
            }>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
        className="flex gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask ARDI…"
          disabled={streaming}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-ardi-surface-foreground/40 focus:border-ardi-neon/60 disabled:opacity-50"
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </motion.aside>
  );
}

export default function Landing() {
  const [ardiOpen, setArdiOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Ardi</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/register">
              <Button size="sm" data-testid="button-get-started-header">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-semibold text-primary mb-6">
              Automated penetration testing
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Penetration testing that runs itself
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              A penetration test is a controlled attempt to break into your own systems, so you find the weaknesses before someone else does. Ardi does that work automatically, on a schedule you set, and reports what it found and how to fix it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" data-testid="button-start-free-trial">
                  Start free trial <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                Watch a demo
              </Button>
            </div>
            <div className="flex items-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                MITRE ATT&CK Coverage
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-3xl" />
            <div className="relative rounded-xl border border-border shadow-2xl bg-card overflow-hidden">
              {/* Dashboard preview mockup */}
              <div className="p-4 border-b border-border bg-sidebar flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-4 h-5 bg-muted rounded text-xs font-mono text-muted-foreground flex items-center px-3">app.ardi.io/dashboard</div>
              </div>
              <div className="p-6 grid grid-cols-4 gap-3">
                {[['8', 'Assets', 'text-foreground'], ['2', 'Active Scans', 'text-primary'], ['13', 'Findings', 'text-orange-400'], ['3', 'Critical', 'text-destructive']].map(([v, l, c]) => (
                  <div key={l} className="bg-background rounded-lg p-3 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{l}</p>
                    <p className={`text-2xl font-bold ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 space-y-2">
                {[['CVE-2024-1234', 'Critical', 'bg-destructive'], ['CVE-2024-5678', 'High', 'bg-orange-500'], ['CVE-2024-9012', 'Medium', 'bg-yellow-500']].map(([id, sev, col]) => (
                  <div key={id} className="flex items-center gap-3 bg-background rounded-lg px-3 py-2 border border-border">
                    <span className={`w-2 h-2 rounded-full ${col} flex-shrink-0`} />
                    <span className="text-xs font-mono text-muted-foreground flex-1">{id}</span>
                    <span className={`text-xs font-bold ${col.replace('bg-', 'text-').replace('destructive', 'destructive').replace('orange-500', 'orange-400').replace('yellow-500', 'yellow-400')}`}>{sev}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manual vs Automated */}
      <section className="container mx-auto px-6 py-24">
        <h2 className="text-4xl font-bold text-center mb-4">How this compares to hiring a testing firm</h2>
        <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-16">
          Most organisations buy a penetration test as a one-off consulting project. Ardi is built to run the same kind of testing continuously.
        </p>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-muted/30 border border-border rounded-xl p-8">
            <h3 className="text-xl font-bold mb-6 text-muted-foreground">A consultant-led engagement</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-destructive text-xs">✕</span>
                </div>
                <span className="text-muted-foreground">Runs once per quarter or year</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-destructive text-xs">✕</span>
                </div>
                <span className="text-muted-foreground">Takes weeks to schedule and execute</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-destructive text-xs">✕</span>
                </div>
                <span className="text-muted-foreground">Typically £4,000-20,000 per engagement</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-destructive text-xs">✕</span>
                </div>
                <span className="text-muted-foreground">Point-in-time snapshot only</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-destructive text-xs">✕</span>
                </div>
                <span className="text-muted-foreground">Limited to consultant availability</span>
              </li>
            </ul>
          </div>
          <div className="bg-primary/5 border border-primary/30 rounded-xl p-8">
            <h3 className="text-xl font-bold mb-6 text-primary">Ardi</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Runs on a schedule you set, not once a year</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Testing begins once you add an asset</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Free for one system, then from £49 a month</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Findings appear as soon as a scan completes</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Covers every asset you add, not a fixed scope</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-6 py-24 bg-card/30 rounded-2xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">What Ardi does</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ardi looks for weaknesses in the systems your business runs on, explains what it found in plain language, and keeps a record you can hand to an auditor or a developer.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Scans that run on their own</h3>
            <p className="text-muted-foreground">
              Ardi picks the tests that suit each system it is pointed at and runs them without anyone having to start the job.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">MITRE ATT&CK mapping</h3>
            <p className="text-muted-foreground">
              MITRE ATT&CK is the public catalogue of the methods real attackers use. Ardi tags each finding against it, so you can see which methods you have tested for and which you have not.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Evidence for compliance work</h3>
            <p className="text-muted-foreground">
              Findings are mapped to the technical controls in ISO 27001, SOC 2, PCI-DSS and HIPAA, and can be exported when an auditor asks what testing you do.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">One place for every system</h3>
            <p className="text-muted-foreground">
              Websites, APIs, internal networks, cloud accounts on AWS, Azure or GCP, and mobile apps are all tested and tracked from the same account.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Alerts where you already work</h3>
            <p className="text-muted-foreground">
              Critical findings can be sent to Slack, PagerDuty or Jira, so the right person sees them without logging into another tool.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Asset discovery</h3>
            <p className="text-muted-foreground">
              Point Ardi at a domain or cloud account and it catalogues the subdomains, services and endpoints it can reach, including ones nobody remembered were running.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How it works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three steps, from adding your first system to reading the results.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center font-bold">1</div>
              <h3 className="text-2xl font-bold">Add your systems</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Tell Ardi which websites, networks, cloud accounts and APIs belong to you. It then maps out the subdomains, services and endpoints attached to them. There is no software to install on your servers.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Globe className="w-4 h-4 text-primary" />
                Websites
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Server className="w-4 h-4 text-primary" />
                Networks
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Cloud className="w-4 h-4 text-primary" />
                Cloud accounts
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Smartphone className="w-4 h-4 text-primary" />
                Mobile apps
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-xl blur-2xl" />
            <div className="relative bg-card border border-card-border rounded-xl p-6 font-mono text-sm">
              <div className="text-primary mb-2"># Add an asset</div>
              <div className="text-muted-foreground">$ ardi assets add \</div>
              <div className="text-muted-foreground ml-4">--name "Production API" \</div>
              <div className="text-muted-foreground ml-4">--type api \</div>
              <div className="text-muted-foreground ml-4">--target https://api.example.com</div>
              <div className="mt-4 text-green-500">✓ Asset created successfully</div>
              <div className="text-muted-foreground">✓ Auto-discovered 47 endpoints</div>
              <div className="text-muted-foreground">✓ Baseline scan scheduled</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute inset-0 bg-primary/10 rounded-xl blur-2xl" />
            <div className="relative rounded-xl border border-border shadow-xl bg-card p-6 grid-pattern min-h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {['Web App', 'Network', 'Cloud AWS', 'API', 'Mobile', 'Database'].map((t) => (
                    <div key={t} className="bg-background rounded-lg p-3 border border-primary/20 flex flex-col items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <p className="text-[10px] text-muted-foreground">{t}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">6 assets under test</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center font-bold">2</div>
              <h3 className="text-2xl font-bold">Ardi runs the tests</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Tests are built from published vulnerability data and the OWASP Top 10, the industry's reference list of the most common web application weaknesses. Ardi adjusts what it tries based on the technology it finds in your stack. You authorise every asset before it is tested.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">OWASP Top 10 and SANS Top 25 coverage</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Known CVEs matched against your software versions</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Login and session handling checks</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Access control and permission checks</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center font-bold">3</div>
              <h3 className="text-2xl font-bold">You get results you can act on</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Each finding comes with a severity score, the MITRE ATT&CK technique it relates to, evidence that it is real, and the change needed to fix it. Reports export in two forms: a short summary for the board and a detailed version for whoever does the work.
            </p>
            <div className="space-y-3">
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Ordered by what matters</span>
                </div>
                <p className="text-xs text-muted-foreground">Ranked by how easily a weakness could be used and how important the affected system is</p>
              </div>
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">How to fix it</span>
                </div>
                <p className="text-xs text-muted-foreground">Written for the framework and language the affected system is built in</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/10 rounded-xl blur-2xl" />
            <div className="relative bg-card border border-card-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">SQL Injection in /api/users</h4>
                <span className="px-2 py-1 bg-destructive/20 text-destructive border border-destructive/50 rounded text-xs font-semibold">Critical</span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">CVSS Score:</span>
                  <span className="ml-2 font-bold text-destructive">9.8</span>
                </div>
                <div>
                  <span className="text-muted-foreground">MITRE ATT&CK:</span>
                  <span className="ml-2 text-primary">T1190 - Exploit Public-Facing Application</span>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-muted-foreground mb-2">Remediation:</p>
                  <div className="bg-muted/30 rounded p-3 font-mono text-xs">
                    Use parameterized queries:<br />
                    <span className="text-green-500">+ cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))</span>
                  </div>
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
      <section id="pricing" className="container mx-auto px-6 py-24 bg-card/30 rounded-2xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Pricing</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            You pay a fixed monthly fee based on how many systems you want tested.
            Start free with one system, no card needed. Prices are in pounds and exclude VAT.
          </p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-card border border-card-border rounded-xl p-8 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <p className="text-muted-foreground text-sm mb-6">For trying it on one system</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">1 system</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Monthly scan</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Full findings, nothing held back</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">No card required</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" data-testid="button-pricing-free">
              Start free
            </Button>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-8 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <p className="text-muted-foreground text-sm mb-6">For a small business or a single product</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£49</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 5 systems</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Weekly scans</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">PDF reports you can hand to a client</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Email alerts on new findings</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" data-testid="button-pricing-starter">
              Get started
            </Button>
          </div>

          <div className="bg-primary/5 border-2 border-primary rounded-xl p-8 relative flex flex-col">
            <h3 className="text-xl font-bold mb-2">Professional</h3>
            <p className="text-muted-foreground text-sm mb-6">For a team that has to answer to auditors</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£199</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 25 systems</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Daily scans</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Compliance mapping and evidence export</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">ARDI, the built-in security assistant</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Slack, Jira and webhook integrations</span>
              </li>
            </ul>
            <Button className="w-full" data-testid="button-pricing-professional">
              Get started
            </Button>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-8 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <p className="text-muted-foreground text-sm mb-6">For large or regulated estates</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">Talk to us</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited systems</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Continuous scanning</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Run the scanner inside your own network</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Single sign-on and audit logging</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">A named contact at Ardi</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" data-testid="button-pricing-enterprise">
              Contact sales
            </Button>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Pay yearly and get two months free. Change plan or cancel whenever you like.
        </p>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">See what Ardi finds on your systems</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Add one system on a trial and read the report it produces. If it tells you nothing you did not already know, you have lost an afternoon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" data-testid="button-start-free-trial-cta">
                Start free trial <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Book a call
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Ardi</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automated penetration testing, run continuously.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
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

      <LandingArdiPanel open={ardiOpen} onClose={() => setArdiOpen(false)} />
    </div>
  );
}
