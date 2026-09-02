import { ArrowUpRight } from 'lucide-react';
import { Link } from 'wouter';
import { securityRoutes } from '@/features/security-home/security-home-content';

export function SecurityToolsSection({ workspaceRoute }: { workspaceRoute: (route: string) => string }) {
  return (
    <section id="security-tools" className="ardi-v2-operations" aria-labelledby="security-tools-title">
      <div className="ardi-v2-shell">
        <div className="ardi-v2-section-head">
          <div><p className="ardi-v2-kicker"><span>02</span> SECURITY TOOLS</p><h2 id="security-tools-title">Every route has a real job.</h2></div>
          <p>No decorative dashboard cards. Each surface opens a working security route backed by the product API.</p>
        </div>
        <div className="ardi-v2-route-board ardi-v2-route-board-tools">
          {securityRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <Link
                key={route.code}
                href={workspaceRoute(route.href)}
                className={`ardi-v2-route ardi-v2-route-${route.code} ${route.emphasis === 'primary' ? 'ardi-v2-route-primary' : ''}`}
              >
                <span className="ardi-v2-route-index">{route.code} / {route.label}</span>
                <Icon /><h3>{route.title}</h3><p>{route.body}</p><b>Open {route.label} <ArrowUpRight /></b>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

