import crypto from "crypto";
import { Chat } from "../models/chat.model.js";
import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { reverseGeocode, fetchOneCall, extractCurrent, extractDaily } from "../services/weather.service.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

// builds compact weather context string so AI doesn't need raw JSON
const buildWeatherContext = async (lat, lon) => {
    const location = await reverseGeocode(lat, lon);
    const oneCall = await fetchOneCall(lat, lon);

    return {
        location,
        current: extractCurrent(oneCall),
        daily: extractDaily(oneCall).slice(0, 7),
    };
};

// POST /message  { message, sessionId?, lat, lon }
const sendMessage = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;
    const { message, sessionId: incomingSessionId, lat, lon } = req.body;

    if (!message) throw new ApiError(400, "message is required");
    if (!lat || !lon) throw new ApiError(400, "lat and lon are required for weather context");

    const sessionId = incomingSessionId || crypto.randomUUID();

    let chat = await Chat.findOne({ sessionId, firebaseUID: uid });
    if (!chat) {
        chat = await Chat.create({ firebaseUID: uid, sessionId, messages: [] });
    }

    const weatherContext = await buildWeatherContext(lat, lon);
    chat.location = weatherContext.location;

    const history = chat.messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    const aiRes = await fetch(`${AI_SERVICE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            weather: weatherContext,
            history,
            now: new Date().toISOString(),
        }),
    });

    if (!aiRes.ok) throw new ApiError(502, "AI service failed to respond");
    const aiData = await aiRes.json();
    const reply = aiData.reply || aiData.response;

    if (!reply) throw new ApiError(502, "AI service returned an empty reply");

    chat.messages.push({ role: "user", content: message });
    chat.messages.push({ role: "assistant", content: reply });
    await chat.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            { sessionId, reply, location: weatherContext.location },
            "Chat reply generated"
        )
    );
});

// GET /history/:sessionId
const getChatHistory = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;
    const { sessionId } = req.params;

    const chat = await Chat.findOne({ sessionId, firebaseUID: uid });
    if (!chat) throw new ApiError(404, "Chat session not found");

    return res.status(200).json(new ApiResponse(200, chat, "Chat history fetched"));
});

// GET /sessions — list this user's chat sessions (latest first)
const listSessions = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;

    const sessions = await Chat.find({ firebaseUID: uid })
        .select("sessionId location createdAt updatedAt")
        .sort({ updatedAt: -1 });

    return res.status(200).json(new ApiResponse(200, sessions, "Sessions fetched"));
});

export { sendMessage, getChatHistory, listSessions };