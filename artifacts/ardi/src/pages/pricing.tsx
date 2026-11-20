import { useEffect, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useArdiAssistant } from "@/features/ardi/ardi-assistant-provider";
import { SecurityHeader } from "@/features/security-home/components/security-header";
import { SecurityFooter } from "@/features/security-home/components/security-footer";
import { routes } from "@/shared/config/routes";
import "@/features/security-home/security-home.css";

type CurrencyCode = "gbp" | "eur" | "usd";
type BillingCycle = "month" | "year";

const CURRENCIES: ReadonlyArray<{ code: CurrencyCode; symbol: string; label: string }> = [
  { code: "gbp", symbol: "£", label: "GBP (£)" },
  { code: "eur", symbol: "€", label: "EUR (€)" },
  { code: "usd", symbol: "$", label: "USD ($)" },
];

function detectDefaultCurrency(): CurrencyCode {
  try {
    const lang = (navigator.language || "").toLowerCase();
    if (lang.includes("gb") || lang.includes("uk")) return "gbp";
    if (
      lang.startsWith("de") ||
      lang.startsWith("fr") ||
      lang.startsWith("es") ||
      lang.startsWith("it") ||
      lang.startsWith("nl") ||
      lang.startsWith("pt") ||
      lang.startsWith("ie")
    ) {
      return "eur";
    }
    if (lang.includes("us")) return "usd";
  } catch {}
  return "gbp";
}

const TIERS = [
  {
    id: "free",
    name: "Free",
    tagline: "Try ARDI on one website before paying anything.",
    monthly: { gbp: 0, eur: 0, usd: 0 },
    yearlyMonthly: { gbp: 0, eur: 0, usd: 0 },
    popular: false,
    custom: false,
    cta: "Start for free",
    features: [
      "1 approved website target",
      "2 automated security checks per month",
      "Simple A+ to F website security grade",
      "Public website registration & server lookup",
      "Plain-English ARDI assistant chat",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Built for founders, small businesses, and solo site owners.",
    monthly: { gbp: 49, eur: 59, usd: 65 },
    yearlyMonthly: { gbp: 39, eur: 47, usd: 52 },
    popular: true,
    custom: false,
    cta: "Choose Business",
    features: [
      "Up to 5 websites or servers",
      "Unlimited security checks & one-click fix re-checks",
      "Weekly monitoring & 'What Changed?' tracking",
      "Fake & lookalike phishing domain scanner",
      "Ready-made Nginx, Cloudflare & alert fix settings",
      "OWASP, SOC 2 & ISO 27001 PDF reports",
      "25 live public research lookups & PDF dossiers/month",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "Built for web agencies, MSPs, investigators, and compliance teams.",
    monthly: { gbp: 149, eur: 179, usd: 199 },
    yearlyMonthly: { gbp: 119, eur: 143, usd: 159 },
    popular: false,
    custom: false,
    cta: "Choose Agency",
    features: [
      "Up to 25 client websites or targets",
      "150 live public research & client PDF dossiers/month",
      "Unlimited lookalike & brand impersonation scans",
      "Client-ready print-to-PDF reports & dossiers",
      "Live CISA active-attack priority enrichment",
      "Automatic trap pages (bot & snooper protection)",
      "Up to 5 team seats & priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom scale, dedicated threat feeds, and tailored compliance.",
    monthly: { gbp: 499, eur: 599, usd: 650 },
    yearlyMonthly: { gbp: 399, eur: 479, usd: 520 },
    popular: false,
    custom: true,
    cta: "Talk to ARDI",
    features: [
      "Unlimited websites, targets, and team seats",
      "Dedicated private threat intelligence (OpenCTI)",
      "Custom self-hosted scanner integration",
      "Custom compliance & audit reporting",
      "Dedicated onboarding and SLA support",
    ],
  },
] as const;

const SINGLE_PASS_PRICE: Record<CurrencyCode, number> = {
  gbp: 29,
  eur: 35,
  usd: 39,
};

export default function PricingPage() {
  const { setOpen: setArdiOpen } = useArdiAssistant();
  const [, navigate] = useLocation();
  const [currency, setCurrency] = useState<CurrencyCode>(() => detectDefaultCurrency());
  const [interval, setInterval] = useState<BillingCycle>("month");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    document.title = "Pricing | ARDI SEC";
  }, []);

  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "£";

  async function selectPlan(planId: string) {
    setNotice("");
    if (planId === "free") {
      navigate(`${routes.register}?plan=free&currency=${currency}`);
      return;
    }
    if (planId === "enterprise") {
      setArdiOpen(true);
      return;
    }
    setBusyPlan(planId);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, currency, interval }),
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
        fallbackHref?: string;
      };
      if (response.ok && payload.url) {
        window.location.assign(payload.url);
        return;
      }
      if (payload.fallbackHref) {
        setNotice(payload.error ?? "Create a free workspace to get started right away.");
        navigate(payload.fallbackHref);
        return;
      }
      setNotice(payload.error ?? "Could not start checkout right now.");
    } catch {
      setNotice("Could not reach the billing service. Please try again.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="dark ardi-security-site min-h-screen bg-[#0c0820] text-white">
      <SecurityHeader activeSection="pricing" onOpenAssistant={() => setArdiOpen(true)} />
      <main id="ardi-main" className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">
            Simple, transparent pricing
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Pay in pounds, euros, or dollars.
          </h1>
          <p className="mt-4 text-base leading-7 text-indigo-100/75">
            Start free on your first website. Upgrade when you want weekly monitoring, fake lookalike domain alerts, and client-ready PDF dossiers.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <div
              className="inline-flex rounded-xl border border-violet-300/25 bg-white/5 p-1"
              role="group"
              aria-label="Choose currency"
            >
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={currency === c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    currency === c.code
                      ? "bg-cyan-200 text-indigo-950"
                      : "text-indigo-100/80 hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div
              className="inline-flex rounded-xl border border-violet-300/25 bg-white/5 p-1"
              role="group"
              aria-label="Choose billing period"
            >
              <button
                type="button"
                aria-pressed={interval === "month"}
                onClick={() => setInterval("month")}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  interval === "month"
                    ? "bg-violet-500 text-white"
                    : "text-indigo-100/80 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                aria-pressed={interval === "year"}
                onClick={() => setInterval("year")}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  interval === "year"
                    ? "bg-violet-500 text-white"
                    : "text-indigo-100/80 hover:text-white"
                }`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>

          {notice ? (
            <p
              role="status"
              className="mx-auto mt-5 max-w-xl rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100"
            >
              {notice}
            </p>
          ) : null}
        </header>

        <section
          className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          aria-label="Subscription plans"
        >
          {TIERS.map((tier) => {
            const amount =
              interval === "year"
                ? tier.yearlyMonthly[currency]
                : tier.monthly[currency];
            return (
              <article
                key={tier.id}
                className={`flex flex-col rounded-2xl border p-6 backdrop-blur ${
                  tier.popular
                    ? "border-cyan-300/60 bg-violet-500/15 shadow-[0_20px_50px_-24px_rgba(34,211,238,0.35)]"
                    : "border-violet-200/15 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-bold">{tier.name}</h2>
                  {tier.popular ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-200 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-950">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      Most popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 min-h-[40px] text-sm text-indigo-100/75">
                  {tier.tagline}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  {tier.custom ? (
                    <span className="text-sm text-indigo-200/75 mr-1">From</span>
                  ) : null}
                  <span className="font-mono text-4xl font-bold">
                    {symbol}
                    {amount}
                  </span>
                  <span className="text-sm text-indigo-200/70">/month</span>
                </div>
                {interval === "year" && amount > 0 ? (
                  <p className="mt-1 text-xs text-cyan-200">
                    Billed annually ({symbol}
                    {amount * 12}/year)
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-indigo-200/60">
                    {amount === 0 ? "No card required" : "Cancel anytime"}
                  </p>
                )}

                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-indigo-50/90">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={busyPlan === tier.id}
                  onClick={() => void selectPlan(tier.id)}
                  className={`mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60 ${
                    tier.popular
                      ? "bg-cyan-200 text-indigo-950 hover:bg-white"
                      : "border border-violet-200/25 bg-white/10 text-white hover:border-cyan-200/60 hover:bg-white/15"
                  }`}
                >
                  {busyPlan === tier.id ? "Opening checkout..." : tier.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </section>

        <section
          className="mt-10 rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-950/70 via-indigo-950/70 to-slate-950/70 p-6 sm:p-8"
          aria-labelledby="single-pass-heading"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
                No subscription required
              </p>
              <h2 id="single-pass-heading" className="mt-2 text-2xl font-bold">
                Single Website Check + Full PDF Dossier Pass
              </h2>
              <p className="mt-2 text-sm leading-6 text-indigo-100/80">
                Just want to check one website or vet one company without a monthly plan? Get a full automated security check, lookalike domain check, A+ to F grade, and a client-ready PDF dossier for a single flat fee.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:shrink-0">
              <div className="text-left sm:text-right">
                <p className="font-mono text-3xl font-bold">
                  {symbol}
                  {SINGLE_PASS_PRICE[currency]}
                </p>
                <p className="text-xs text-indigo-200/70">One-time payment</p>
              </div>
              <button
                type="button"
                disabled={busyPlan === "single_pass"}
                onClick={() => void selectPlan("single_pass")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-200 px-6 text-sm font-semibold text-indigo-950 transition hover:bg-white disabled:opacity-60"
              >
                {busyPlan === "single_pass" ? "Opening checkout..." : "Buy Single Pass"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-indigo-200/60">
          All prices are shown in {currency.toUpperCase()}. Applicable UK/EU VAT or local sales tax is calculated automatically at checkout. Already have an account?{" "}
          <Link href={routes.login} className="text-cyan-200 underline underline-offset-2">
            Sign in here
          </Link>
          .
        </p>
      </main>
      <SecurityFooter />
    </div>
  );
}
