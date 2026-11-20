import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import assetsRouter from "./assets";
import scansRouter from "./scans";
import findingsRouter from "./findings";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import osintRouter from "./osint";
import ardiRouter from "./ardi";
import intelligenceRouter from "./intelligence";
import billingRouter from "./billing";
import brandingRouter from "./branding";
import webhooksRouter from "./webhooks";
import apiKeysRouter from "./api-keys";
import cronRouter from "./cron";
import publicCheckRouter from "./public-check";
import publicShareRouter from "./public-share";
import publicBadgeRouter from "./public-badge";
import { requireAuth } from "../middlewares/require-auth";

const router: IRouter = Router();

// Public: health check, the auth endpoints (login/register/me handle their
// own token checks), and ARDI (it serves the anonymous marketing-page chat
// too — it does its own optional auth check and only trusts a verified
// token, never a client-supplied user id, for anything user-scoped).
// Everything mounted after requireAuth needs a valid session — this is the
// line that turned the API from wide-open to gated.
router.use(healthRouter);
router.use(authRouter);
router.use(ardiRouter);
router.use(intelligenceRouter);
router.use(billingRouter);
router.use(cronRouter);
router.use(publicCheckRouter);
router.use(publicShareRouter);
router.use(publicBadgeRouter);

router.use(requireAuth);

router.use(assetsRouter);
router.use(scansRouter);
router.use(findingsRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(osintRouter);
router.use(brandingRouter);
router.use(webhooksRouter);
router.use(apiKeysRouter);

export default router;
