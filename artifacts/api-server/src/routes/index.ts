import { Router, type IRouter } from "express";
import healthRouter from "./health";
import translateRouter from "./translate";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(translateRouter);
router.use(syncRouter);

export default router;
