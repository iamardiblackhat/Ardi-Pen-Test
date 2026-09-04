import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import assetsRouter from "./assets";
import scansRouter from "./scans";
import findingsRouter from "./findings";
import reportsRouter from "./reports";
import complianceRouter from "./compliance";
import dashboardRouter from "./dashboard";
import osintRouter from "./osint";
import ardiRouter from "./ardi";
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

router.use(requireAuth);

router.use(assetsRouter);
router.use(scansRouter);
router.use(findingsRouter);
router.use(reportsRouter);
router.use(complianceRouter);
router.use(dashboardRouter);
router.use(osintRouter);

export default router;
