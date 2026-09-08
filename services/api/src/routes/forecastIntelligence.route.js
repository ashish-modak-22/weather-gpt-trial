import { Router } from "express";
import { getForecastIntelligence } from "../controllers/forecastIntelligence.controller.js";

const router = Router();

router.get("/forecast-intelligence", getForecastIntelligence);

export default router;