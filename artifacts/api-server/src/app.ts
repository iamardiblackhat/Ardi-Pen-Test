import express, { type Express } from "express";
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
// Defaults to reflecting the request origin in dev; lock to CORS_ORIGIN in prod.
const corsOrigin = process.env["CORS_ORIGIN"];
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

export default app;
