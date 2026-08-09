import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import { pinoHttp, type Options as PinoHttpOptions } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { tripwire } from "./middlewares/tripwire";

const app: Express = express();

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Last-resort error handler. Without this, Express 5's default handler
// returns an HTML page and, outside production, the error's stack trace —
// unacceptable for a JSON API and a potential internals leak. Every route
// here is async, so this mainly catches rejected promises Express 5 now
// forwards automatically, plus anything thrown synchronously before that.
const jsonErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({ err, url: req.url }, "unhandled route error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error." });
};
app.use(jsonErrorHandler);

export default app;
