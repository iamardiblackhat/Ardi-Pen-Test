import { ArrowUpRight, Globe2, Network, Satellite } from "lucide-react";

/** Botazez remains its own application; this handoff shares no session or tokens. */
export function BotazezConnection() {
  return (
    <section className="ardi-glass-card p-5 sm:p-7" aria-labelledby="botazez-connection-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/40 bg-cyan-200/10 text-cyan-100"><Globe2 aria-hidden="true" /></span>
          <div>
            <h2 id="botazez-connection-title" className="text-2xl font-semibold tracking-tight text-slate-50">Botazez intelligence dashboard</h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-300">Open the wider intelligence map for geographic context, public-source monitoring and investigation tools. Return to ARDI for your security workspace, findings and reports.</p>
          </div>
        </div>
        <a href="https://botazez.com/" target="_blank" rel="noopener noreferrer" className="ardi-v2-button ardi-v2-button-chat inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/50 px-5 py-3 text-base font-semibold text-cyan-50">Open Botazez <ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-emerald-100">
        <span className="inline-flex items-center gap-2"><Globe2 size={16} aria-hidden="true" />Intelligence map</span>
        <span className="inline-flex items-center gap-2"><Satellite size={16} aria-hidden="true" />Public data layers</span>
        <span className="inline-flex items-center gap-2"><Network size={16} aria-hidden="true" />Investigation context</span>
      </div>
    </section>
  );
}
