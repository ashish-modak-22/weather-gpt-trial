import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolveLocation, fetchOneCall, extractCurrent, extractHourly, extractDaily } from "../services/weather.service.js";
import { fetchOpenMeteoDaily } from "../services/openMeteo.service.js";
import { computeRainWindows } from "../services/rain.service.js";
import { compareSources, detectForecastChange, detectTrend } from "../services/forecastIntelligence.service.js";
import { ForecastSnapshot, toLocationKey } from "../models/forecastSnapshot.model.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
const VALID_QUESTION_TYPES = ["rain", "temperature", "forecast_change", "storm_warning"];

// POST /explain  { questionType, city|pincode|lat+lon }
const explainForecast = asyncHandler(async (req, res) => {
    const { questionType } = req.body;

    if (!VALID_QUESTION_TYPES.includes(questionType)) {
        throw new ApiError(400, `questionType must be one of: ${VALID_QUESTION_TYPES.join(", ")}`);
    }

    const location = await resolveLocation(req.body);
    const oneCall = await fetchOneCall(location.lat, location.lon);
    const owmDaily = extractDaily(oneCall);
    const hourly = extractHourly(oneCall);

    const locationKey = toLocationKey(location.lat, location.lon);
    const previousSnapshot = await ForecastSnapshot.findOne({ locationKey }).sort({ fetchedAt: -1 });
    const openMeteoDaily = await fetchOpenMeteoDaily(location.lat, location.lon);

    const comparison = compareSources(owmDaily, openMeteoDaily);
    const trend = detectTrend(owmDaily);
    const forecastChange = detectForecastChange(previousSnapshot?.daily, owmDaily);

    const weather = { location, current: extractCurrent(oneCall) };
    const rainIntelligence = { windows: computeRainWindows(hourly) };
    const forecastIntelligence = {
        confidence: comparison.confidence,
        modelAgreement: `${comparison.agreementCount}/${comparison.daysCompared} sources`,
        trend,
        forecastChange,
    };

    const aiRes = await fetch(`${AI_SERVICE_URL}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            questionType,
            weather,
            rainIntelligence,
            forecastIntelligence,
            now: new Date().toISOString(),
        }),
    });

    if (!aiRes.ok) throw new ApiError(502, "AI service failed to generate explanation");
    const aiData = await aiRes.json();

    return res.status(200).json(
        new ApiResponse(200, { location, questionType, explanation: aiData.explanation }, "Explanation generated")
    );
});

export { explainForecast };