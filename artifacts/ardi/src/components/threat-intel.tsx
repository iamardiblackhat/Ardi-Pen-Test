import { useState, useEffect } from 'react';
import { Globe, AlertTriangle, Activity } from 'lucide-react';
import { auth } from '@/lib/auth';

/**
 * Live OpenCTI threat intelligence for one finding.
 *
 * Fetches /api/findings/:id/threat-intel. This is the visible surface of the
 * threat-intel library — KEV status, EPSS, and linked threat actors, shown
 * inside the finding detail so a CVE stops being just a number.
 */

interface Intel {
  enabled: boolean;
  cve: string | null;
  knownExploited: boolean;
  epssScore: number | null;
  epssPercentile: number | null;
  cvssBaseScore: number | null;
  cvssBaseSeverity: string | null;
  threatActors: { name: string; type: string; aliases: string[] }[];
  priority: number;
  confidence: 'matched' | 'no-record' | 'unavailable';
}

export function ThreatIntel({ findingId }: { findingId: number }) {
  const [intel, setIntel] = useState<Intel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/findings/${findingId}/threat-intel`, {
      headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { if (alive) setIntel(d); })
      .catch(() => { if (alive) setIntel(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [findingId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Checking threat intelligence…
      </div>
    );
  }
  if (!intel) return null;

  // Not configured, or OpenCTI unreachable — say so honestly rather than
  // implying the CVE is safe.
  if (!intel.enabled || intel.confidence === 'unavailable') {
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Threat intelligence</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {intel.enabled
            ? 'Threat intelligence service is currently unavailable — this is not a statement that the CVE is safe.'
            : 'OpenCTI is not connected. Set OPENCTI_URL and OPENCTI_TOKEN to enrich findings with live exploitation data.'}
        </p>
      </div>
    );
  }

  if (intel.confidence === 'no-record' && !intel.cve) return null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Threat intelligence</span>
          <span className="text-[10px] text-muted-foreground">via OpenCTI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Priority</span>
          <span
            className={`text-sm font-semibold ${
              intel.priority >= 70 ? 'text-severity-critical'
                : intel.priority >= 40 ? 'text-severity-medium'
                : 'text-muted-foreground'
            }`}
          >
            {intel.priority}/100
          </span>
        </div>
      </div>

      {intel.knownExploited && (
        <div className="flex items-center gap-2 rounded-md bg-severity-critical/10 border border-severity-critical/30 px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0" />
          <span className="text-xs font-medium text-severity-critical">
            On CISA's Known Exploited Vulnerabilities list — actively exploited in the wild. Fix this first.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        {intel.epssScore !== null && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Exploit probability (EPSS)
            </p>
            <p className="font-semibold">
              {(intel.epssScore * 100).toFixed(1)}%
              {intel.epssPercentile !== null && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(intel.epssPercentile * 100)}th pct)
                </span>
              )}
            </p>
          </div>
        )}
        {intel.cvssBaseScore !== null && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">CVSS (OpenCTI)</p>
            <p className="font-semibold">
              {intel.cvssBaseScore.toFixed(1)}
              {intel.cvssBaseSeverity && (
                <span className="text-xs text-muted-foreground ml-1 capitalize">{intel.cvssBaseSeverity}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {intel.threatActors.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Linked threat actors</p>
          <div className="flex flex-wrap gap-1.5">
            {intel.threatActors.map((a) => (
              <span
                key={a.name}
                title={a.aliases.length ? `Also known as: ${a.aliases.join(', ')}` : undefined}
                className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/5 px-2.5 py-0.5 text-xs"
              >
                {a.name}
                <span className="text-[9px] text-muted-foreground">{a.type.replace('-', ' ')}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {intel.confidence === 'no-record' && (
        <p className="text-xs text-muted-foreground">
          No OpenCTI record for {intel.cve ?? 'this finding'} — it may be too new or not yet catalogued.
        </p>
      )}
    </div>
  );
}
