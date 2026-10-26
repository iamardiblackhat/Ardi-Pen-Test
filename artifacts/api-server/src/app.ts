import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import { pinoHttp, type Options as PinoHttpOptions } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { tripwire } from "./middlewares/tripwire";

const app: Express = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  next();
});

const pinoHttpOptions: PinoHttpOptions = {
  logger,
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: (req.url as string)?.split("?")[0],
      };
    },
    res(res) {
      return { statusCode: (res as { statusCode: number }).statusCode };
    },
  },
};
app.use(pinoHttp(pinoHttpOptions));

// CORS restricted to the configured origin. A bare cors() allows any site to
// call the authenticated API from a user's browser — unacceptable here.
// Defaults to reflecting the request origin in dev; lock to CORS_ORIGIN in
// prod. A production deploy that forgets CORS_ORIGIN must not silently fall
// back to allowing any origin, so fail loud instead — same pattern as
// JWT_SECRET in lib/auth.ts.
const corsOrigin = process.env["CORS_ORIGIN"];
if (!corsOrigin && process.env["NODE_ENV"] === "production") {
  throw new Error(
    "CORS_ORIGIN is required in production. Set it to your frontend's origin(s), comma-separated.",
  );
}
app.use(
  cors({
    origin: corsOrigin ? corsOrigin.split(",").map((o) => o.trim()) : true,
    credentials: true,
  }),
);

// Honeypot tripwires run before the body parser and before routing, so a probe
// to /.env is caught and blocked without touching application logic.
app.use(tripwire);

// Bound work before schemas, authentication or model calls. Compressed request
// bodies are unnecessary for this API and never enter an inflater.
app.use(express.json({ limit: "64kb", inflate: false }));
app.use(express.urlencoded({ extended: false, limit: "64kb", parameterLimit: 100, inflate: false }));

app.use("/api", router);

// Last-resort error handler. Without this, Express 5's default handler
// returns an HTML page and, outside production, the error's stack trace —
// unacceptable for a JSON API and a potential internals leak. Every route
// here is async, so this mainly catches rejected promises Express 5 now
// forwards automatically, plus anything thrown synchronously before that.
const jsonErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;
  const type = (err as { type?: string }).type;
  if (type === "entity.parse.failed") { res.status(400).json({ error: "Invalid JSON request." }); return; }
  if (type === "entity.too.large" || type === "parameters.too.many") { res.status(413).json({ error: "Request is too large." }); return; }
  if (type === "encoding.unsupported" || type === "charset.unsupported") { res.status(415).json({ error: "Unsupported request encoding." }); return; }
  logger.error({ err, url: req.path }, "unhandled route error");
  res.status(500).json({ error: "Internal server error." });
};
app.use(jsonErrorHandler);

export default app;
