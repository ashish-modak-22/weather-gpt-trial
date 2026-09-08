import { Router } from "express";
import { getRainIntelligence } from "../controllers/rain.controller.js";

const router = Router();

// public — same access level as the rest of the weather endpoints
router.get("/rain-intelligence", getRainIntelligence);

export default router;