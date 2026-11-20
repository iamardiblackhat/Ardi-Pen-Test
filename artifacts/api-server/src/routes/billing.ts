import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "../middlewares/rate-limit";

const router = Router();

export type BillingCurrency = "gbp" | "eur" | "usd";
export type BillingInterval = "month" | "year";

export const PRICING_CATALOG = {
  currencies: {
    gbp: { code: "GBP", symbol: "£", label: "British Pound (£)" },
    eur: { code: "EUR", symbol: "€", label: "Euro (€)" },
    usd: { code: "USD", symbol: "$", label: "US Dollar ($)" },
  },
  tiers: [
    {
      id: "free",
      name: "Free",
      tagline: "Try ARDI on one website before you pay a penny.",
      monthly: { gbp: 0, eur: 0, usd: 0 },
      yearlyMonthly: { gbp: 0, eur: 0, usd: 0 },
      popular: false,
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
      features: [
        "Up to 5 approved websites or servers",
        "Unlimited security checks & one-click fix re-checks",
        "Weekly monitoring & 'What Changed?' diff tracking",
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
      features: [
        "Up to 25 client websites or targets",
        "150 live public research & client PDF dossiers/month",
        "Unlimited lookalike & brand impersonation scans",
        "Client-ready print-to-PDF reports & dossiers",
        "Live threat intelligence & CISA active-attack priority",
        "Automatic trap pages (bot & snooper protection)",
        "Up to 5 team seats & priority support",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      tagline: "Custom scale, dedicated feeds, and tailored compliance workflows.",
      monthly: { gbp: 499, eur: 599, usd: 650 },
      yearlyMonthly: { gbp: 399, eur: 479, usd: 520 },
      popular: false,
      customPricing: true,
      features: [
        "Unlimited websites, targets, and team seats",
        "Dedicated private threat intelligence (OpenCTI)",
        "Custom self-hosted scanner integration",
        "Custom compliance & audit reporting",
        "Dedicated onboarding and SLA support",
      ],
    },
  ],
  singlePass: {
    id: "single_pass",
    name: "Single Check + PDF Dossier Pass",
    tagline: "One-time payment, no subscription. Ideal for a one-off website audit or company check.",
    price: { gbp: 29, eur: 35, usd: 39 },
    features: [
      "1 full automated website security check & A+ to F grade",
      "1 full company & domain due diligence PDF dossier",
      "Lookalike phishing domain check included",
      "Ready-made fix settings to hand to your developer",
    ],
  },
} as const;

router.get("/billing/plans", (_req, res): void => {
  res.json({
    checkoutConfigured: Boolean(process.env["STRIPE_SECRET_KEY"]),
    ...PRICING_CATALOG,
  });
});

const checkoutBody = z.object({
  planId: z.enum(["business", "agency", "single_pass"]),
  currency: z.enum(["gbp", "eur", "usd"]).default("gbp"),
  interval: z.enum(["month", "year"]).default("month"),
});

router.post(
  "/billing/checkout",
  rateLimit(15, 60_000),
  async (req, res): Promise<void> => {
    const parsed = checkoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Select a valid plan and currency (GBP, EUR, or USD)." });
      return;
    }

    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) {
      res.status(503).json({
        error:
          "Online card checkout is being activated. Create a free workspace now to start using ARDI right away.",
        fallbackHref: `/register?plan=${parsed.data.planId}&currency=${parsed.data.currency}`,
      });
      return;
    }

    const { planId, currency, interval } = parsed.data;
    const origin =
      process.env["CORS_ORIGIN"]?.split(",")[0]?.trim() ||
      "https://ardi-pen-test-api-server-one.vercel.app";

    const params = new URLSearchParams();
    params.set("success_url", `${origin}/dashboard?checkout=success&plan=${planId}`);
    params.set("cancel_url", `${origin}/pricing?checkout=cancelled`);
    params.set("automatic_tax[enabled]", "true");

    if (planId === "single_pass") {
      const amount = PRICING_CATALOG.singlePass.price[currency] * 100;
      params.set("mode", "payment");
      params.set("line_items[0][quantity]", "1");
      params.set("line_items[0][price_data][currency]", currency);
      params.set("line_items[0][price_data][unit_amount]", String(amount));
      params.set(
        "line_items[0][price_data][product_data][name]",
        "ARDI SEC Single Check + PDF Dossier Pass",
      );
    } else {
      const tier = PRICING_CATALOG.tiers.find((t) => t.id === planId)!;
      const unitAmount =
        interval === "year"
          ? tier.yearlyMonthly[currency] * 12 * 100
          : tier.monthly[currency] * 100;
      params.set("mode", "subscription");
      params.set("line_items[0][quantity]", "1");
      params.set("line_items[0][price_data][currency]", currency);
      params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
      params.set("line_items[0][price_data][recurring][interval]", interval);
      params.set(
        "line_items[0][price_data][product_data][name]",
        `ARDI SEC ${tier.name} Plan (${interval === "year" ? "Annual" : "Monthly"})`,
      );
    }

    try {
      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        signal: AbortSignal.timeout(12_000),
        headers: {
          authorization: `Bearer ${stripeKey}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const session = (await stripeRes.json()) as { url?: string; error?: { message?: string } };
      if (!stripeRes.ok || !session.url) {
        res.status(502).json({
          error: session.error?.message ?? "Stripe checkout could not be created.",
        });
        return;
      }
      res.json({ url: session.url });
    } catch {
      res.status(502).json({ error: "Payment service is temporarily unreachable." });
    }
  },
);

export default router;
