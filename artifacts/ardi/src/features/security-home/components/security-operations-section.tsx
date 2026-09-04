import { ArrowRight, Binoculars, Crosshair, FileCheck2 } from 'lucide-react';
import { Link } from 'wouter';
import { routes } from '@/shared/config/routes';

const operations = [
  { label: 'INVESTIGATE', title: 'Work current public evidence.', id: 'open-source-investigations', icon: Binoculars, className: 'ardi-v2-capability-test' },
  { label: 'TEST', title: 'Assess an authorised digital target.', id: 'attack-surface', icon: Crosshair, className: 'ardi-v2-capability-evidence' },
  { label: 'PROVE', title: 'Turn verified evidence into action.', id: 'evidence-reporting', icon: FileCheck2, className: 'ardi-v2-capability-intel' },
] as const;

export function SecurityOperationsSection() {
  return (
    <section id="operations" className="ardi-v2-capabilities" aria-labelledby="operations-title">
      <div className="ardi-v2-shell">
        <div className="ardi-v2-section-head ardi-v2-capability-head">
          <div><p className="ardi-v2-kicker"><span>01</span> SECURITY OPERATIONS</p><h2 id="operations-title">Discover. Test. Prove.</h2></div>
          <p>Start with the outcome. Review the workflow and its real outputs before creating a workspace.</p>
        </div>
        <div className="ardi-v2-capability-grid">
          {operations.map((operation) => {
            const Icon = operation.icon;
            return <Link key={operation.id} href={`${routes.capabilities}#${operation.id}`} className={`ardi-v2-capability ${operation.className}`}><Icon /><p>{operation.label}</p><h3>{operation.title}</h3><span>See operation <ArrowRight /></span></Link>;
          })}
        </div>
      </div>
    </section>
  );
}
