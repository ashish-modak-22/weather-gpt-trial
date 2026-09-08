import { Router } from "express";
import { explainForecast } from "../controllers/explain.controller.js";

const router = Router();

router.post("/", explainForecast);

export default router;