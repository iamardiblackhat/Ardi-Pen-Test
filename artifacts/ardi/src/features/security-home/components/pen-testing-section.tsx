import { ArrowRight, Crosshair, FileCheck2, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { routes } from '@/shared/config/routes';

export function PenTestingSection({ workspaceRoute }: { workspaceRoute: (route: string) => string }) {
  return (
    <section id="pen-testing" className="ardi-v2-capabilities" aria-labelledby="pen-testing-title">
      <div className="ardi-v2-shell">
        <div className="ardi-v2-section-head ardi-v2-capability-head">
          <div><p className="ardi-v2-kicker"><span>01</span> PEN TESTING</p><h2 id="pen-testing-title">Authorise. Execute. Prove.</h2></div>
          <p>The primary workflow is a real create → start → monitor → evidence sequence, not a sign-up illustration.</p>
        </div>
        <div className="ardi-v2-capability-grid">
          <Link href={workspaceRoute(routes.assets)} className="ardi-v2-capability ardi-v2-capability-test"><ShieldCheck /><p>AUTHORISE</p><h3>Define the approved target.</h3><span>Open scope <ArrowRight /></span></Link>
          <Link href={workspaceRoute(routes.scans)} className="ardi-v2-capability ardi-v2-capability-evidence"><Crosshair /><p>EXECUTE</p><h3>Run the Pen Test.</h3><span>Open Pen Testing <ArrowRight /></span></Link>
          <Link href={workspaceRoute(routes.findings)} className="ardi-v2-capability ardi-v2-capability-intel"><FileCheck2 /><p>PROOF</p><h3>Review evidence and remediation.</h3><span>Open findings <ArrowRight /></span></Link>
        </div>
      </div>
    </section>
  );
}

