import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import assetsRouter from "./assets";
import scansRouter from "./scans";
import findingsRouter from "./findings";
import reportsRouter from "./reports";
import complianceRouter from "./compliance";
import dashboardRouter from "./dashboard";
import ardiRouter from "./ardi";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(assetsRouter);
router.use(scansRouter);
router.use(findingsRouter);
router.use(reportsRouter);
router.use(complianceRouter);
router.use(dashboardRouter);
router.use(ardiRouter);

export default router;
