import { Router } from "express";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { sendMessage, getChatHistory, listSessions } from "../controllers/chat.controller.js";

const router = Router();

router.post("/message", verifyFirebaseToken, sendMessage);
router.get("/sessions", verifyFirebaseToken, listSessions);
router.get("/history/:sessionId", verifyFirebaseToken, getChatHistory);

export default router;