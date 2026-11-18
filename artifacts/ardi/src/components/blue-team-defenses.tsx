import { useEffect, useState } from "react";
import { Check, Copy, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@workspace/ardi-ds/components/ui/button";
import { auth } from "@/lib/auth";

interface DefensesPayload {
  findingId: number;
  compliance: {
    owaspTop10: string;
    soc2: string;
    iso27001: string;
    nistCsf: string;
  };
  rules: {
    nginx: string;
    cloudflareWaf: string;
    sigma: string;
  };
}

type RuleTab = "nginx" | "cloudflareWaf" | "sigma";

const TAB_LABELS: ReadonlyArray<{ id: RuleTab; label: string }> = [
  { id: "nginx", label: "Nginx Hardening" },
  { id: "cloudflareWaf", label: "Cloudflare WAF" },
  { id: "sigma", label: "Sigma SIEM Rule" },
];

export function BlueTeamDefenses({ findingId }: { findingId: number }) {
  const [data, setData] = useState<DefensesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RuleTab>("nginx");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/findings/${findingId}/defenses`, {
      headers: auth.getToken()
        ? { authorization: `Bearer ${auth.getToken()}` }
        : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DefensesPayload | null) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [findingId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Loading compliance mapping &amp; Blue Team detection rules…
      </div>
    );
  }
  if (!data) return null;

  const currentRule = data.rules[tab];

  async function copyCurrentRule() {
    try {
      await navigator.clipboard.writeText(currentRule);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border p-4"
      aria-label="Blue Team defense & compliance controls"
    >
      <div>
        <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Compliance Framework Mapping
        </h3>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <dt className="font-mono uppercase tracking-wide text-muted-foreground">
              OWASP Top 10
            </dt>
            <dd className="mt-0.5 font-medium">{data.compliance.owaspTop10}</dd>
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <dt className="font-mono uppercase tracking-wide text-muted-foreground">
              SOC 2
            </dt>
            <dd className="mt-0.5 font-medium">{data.compliance.soc2}</dd>
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <dt className="font-mono uppercase tracking-wide text-muted-foreground">
              ISO 27001
            </dt>
            <dd className="mt-0.5 font-medium">{data.compliance.iso27001}</dd>
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <dt className="font-mono uppercase tracking-wide text-muted-foreground">
              NIST CSF
            </dt>
            <dd className="mt-0.5 font-medium">{data.compliance.nistCsf}</dd>
          </div>
        </dl>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
            Defensive Rules &amp; Detection Playbook
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyCurrentRule}
          >
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Copy rule
              </>
            )}
          </Button>
        </div>

        <div
          className="mb-2 flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Defense rule formats"
        >
          {TAB_LABELS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setCopied(false);
              }}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                tab === item.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <pre
          role="tabpanel"
          className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs font-mono leading-relaxed"
        >
          {currentRule}
        </pre>
      </div>
    </section>
  );
}
