import { Link } from 'wouter';
import { Shield, Zap, Lock, BarChart3, Globe, Clock, CheckCircle2, ArrowRight, Server, Cloud, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroDashboardPath from '@assets/generated_images/hero-dashboard.png';
import securityNetworkPath from '@assets/generated_images/security-network.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg glow-primary">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Ardi</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register">
              <Button size="sm" className="glow-primary" data-testid="button-get-started-header">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-mono font-semibold text-primary mb-6">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
              AUTONOMOUS SECURITY TESTING
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Penetration testing that runs itself
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Ardi is the command center for security teams who run continuous, authorized penetration tests at scale. No manual work. No blind spots. Just autonomous security validation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="glow-primary-strong" data-testid="button-start-free-trial">
                  Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                SOC 2 Compliant
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                MITRE ATT&CK Coverage
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                99.9% Uptime
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-3xl" />
            <img 
              src={heroDashboardPath} 
              alt="Ardi security dashboard interface" 
              className="relative rounded-xl border border-border shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-primary">10M+</p>
              <p className="text-sm text-muted-foreground mt-2">Scans Executed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-primary">47.2K</p>
              <p className="text-sm text-muted-foreground mt-2">Vulnerabilities Found</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-primary">99.1%</p>
              <p className="text-sm text-muted-foreground mt-2">Detection Accuracy</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-primary">24/7</p>
              <p className="text-sm text-muted-foreground mt-2">Continuous Monitoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Manual vs Automated */}
      <section className="container mx-auto px-6 py-24">
        <h2 className="text-4xl font-bold text-center mb-16">Manual pentesting vs. Ardi</h2>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-muted/30 border border-border rounded-xl p-8">
            <h3 className="text-xl font-bold mb-6 text-muted-foreground">Traditional Manual Pentesting</h3>
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
                <span className="text-muted-foreground">Costs $15,000-50,000 per engagement</span>
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
          <div className="bg-primary/5 border border-primary/30 rounded-xl p-8 glow-primary">
            <h3 className="text-xl font-bold mb-6 text-primary">Ardi Autonomous Platform</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Continuous 24/7 testing</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Starts in minutes, not weeks</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Flat monthly rate from $2,500</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Real-time vulnerability detection</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Scales with your infrastructure</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-6 py-24 bg-card/30 rounded-2xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Built for elite security teams</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to run continuous, authorized penetration tests at enterprise scale
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Autonomous Orchestration</h3>
            <p className="text-muted-foreground">
              AI-powered scan engines select the right tests, adapt to your environment, and execute without human intervention.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">MITRE ATT&CK Mapping</h3>
            <p className="text-muted-foreground">
              Every finding mapped to tactics and techniques. Visualize your coverage gaps at a glance with our interactive matrix.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Compliance Automation</h3>
            <p className="text-muted-foreground">
              Automated SOC 2, PCI-DSS, ISO 27001, and HIPAA control validation. Generate compliance reports on demand.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Multi-Environment Coverage</h3>
            <p className="text-muted-foreground">
              Test web apps, APIs, networks, AWS/Azure/GCP cloud infrastructure, and mobile apps from one platform.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Real-Time Alerting</h3>
            <p className="text-muted-foreground">
              Get instant notifications for critical findings. Integrate with Slack, PagerDuty, JIRA, and your existing security stack.
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Asset Discovery</h3>
            <p className="text-muted-foreground">
              Automatically discover and catalog all testable assets across your infrastructure. Never miss a shadow IT deployment.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How it works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From asset onboarding to continuous validation in three steps
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center font-bold font-mono glow-primary">1</div>
              <h3 className="text-2xl font-bold">Connect Your Assets</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Add your web applications, networks, cloud accounts, and APIs. Ardi automatically discovers subdomains, services, and endpoints. No agent installation required — works with your existing infrastructure.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Globe className="w-4 h-4 text-primary" />
                Web Apps
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Server className="w-4 h-4 text-primary" />
                Networks
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Cloud className="w-4 h-4 text-primary" />
                Cloud Infrastructure
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                <Smartphone className="w-4 h-4 text-primary" />
                Mobile Apps
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
            <img 
              src={securityNetworkPath}
              alt="Security network visualization"
              className="relative rounded-xl border border-border shadow-xl"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center font-bold font-mono glow-primary">2</div>
              <h3 className="text-2xl font-bold">Autonomous Testing</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Ardi runs continuous penetration tests using the latest CVE data, OWASP Top 10 techniques, and custom attack chains. Tests adapt based on discovered technology stack and previous findings. All scans are authorized and safe for production.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">OWASP Top 10 & SANS Top 25 coverage</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Zero-day vulnerability detection</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Authentication & session testing</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Business logic flaw detection</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center font-bold font-mono glow-primary">3</div>
              <h3 className="text-2xl font-bold">Actionable Intelligence</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Every finding includes full context: CVSS score, MITRE ATT&CK mapping, exploit proof-of-concept, and step-by-step remediation. Export executive summaries for leadership or technical reports for engineering teams.
            </p>
            <div className="space-y-3">
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Finding Prioritization</span>
                  <span className="text-xs font-mono text-primary">AI-Powered</span>
                </div>
                <p className="text-xs text-muted-foreground">Ranked by exploitability, asset criticality, and business impact</p>
              </div>
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Remediation Guidance</span>
                  <span className="text-xs font-mono text-primary">Code-Level</span>
                </div>
                <p className="text-xs text-muted-foreground">Framework-specific fixes for your tech stack</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/10 rounded-xl blur-2xl" />
            <div className="relative bg-card border border-card-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">SQL Injection in /api/users</h4>
                <span className="px-2 py-1 bg-destructive/20 text-destructive border border-destructive/50 rounded text-xs font-mono font-semibold">CRITICAL</span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">CVSS Score:</span>
                  <span className="ml-2 font-mono font-bold text-destructive">9.8</span>
                </div>
                <div>
                  <span className="text-muted-foreground">MITRE ATT&CK:</span>
                  <span className="ml-2 font-mono text-primary">T1190 - Exploit Public-Facing Application</span>
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

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-6 py-24 bg-card/30 rounded-2xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Enterprise pricing</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transparent pricing that scales with your security program
          </p>
        </div>
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card border border-card-border rounded-xl p-8">
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <p className="text-muted-foreground text-sm mb-6">For small teams getting started</p>
            <div className="mb-6">
              <span className="text-4xl font-bold font-mono">$2,500</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 10 assets</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Weekly scans</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Basic reporting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Email support</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" data-testid="button-pricing-starter">
              Get Started
            </Button>
          </div>

          <div className="bg-primary/5 border-2 border-primary rounded-xl p-8 relative glow-primary-strong">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold font-mono">
              MOST POPULAR
            </div>
            <h3 className="text-xl font-bold mb-2">Professional</h3>
            <p className="text-muted-foreground text-sm mb-6">For growing security teams</p>
            <div className="mb-6">
              <span className="text-4xl font-bold font-mono">$7,500</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 50 assets</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Daily scans</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Advanced reporting & compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Priority support</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">MITRE ATT&CK mapping</span>
              </li>
            </ul>
            <Button className="w-full glow-primary" data-testid="button-pricing-professional">
              Get Started
            </Button>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-8">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <p className="text-muted-foreground text-sm mb-6">For large organizations</p>
            <div className="mb-6">
              <span className="text-4xl font-bold font-mono">Custom</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited assets</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Continuous scanning</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Custom integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Dedicated CSM</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">SLA guarantee</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" data-testid="button-pricing-enterprise">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-12 text-center glow-primary-strong">
          <h2 className="text-4xl font-bold mb-4">Ready to modernize your pentest program?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join security teams at Fortune 500 companies who trust Ardi to protect their infrastructure
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="glow-primary-strong" data-testid="button-start-free-trial-cta">
                Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Schedule Demo
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
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg glow-primary">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Ardi</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Autonomous penetration testing for modern security teams
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
            © 2024 Ardi Security, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
