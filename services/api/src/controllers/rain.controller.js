import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolveLocation, fetchOneCall, extractHourly } from "../services/weather.service.js";
import { computeRainWindows, getNextRainWindow } from "../services/rain.service.js";

// GET /rain-intelligence?city=|pincode=|lat=&lon=
const getRainIntelligence = asyncHandler(async (req, res) => {
    const location = await resolveLocation(req.query);
    const oneCall = await fetchOneCall(location.lat, location.lon);
    const hourly = extractHourly(oneCall);

    const windows = computeRainWindows(hourly);
    const nextWindow = getNextRainWindow(hourly);

    if (!nextWindow) {
        return res.status(200).json(
            new ApiResponse(200, { location, windows, nextWindow: null }, "No significant rain expected in forecast range")
        );
    }

    return res.status(200).json(new ApiResponse(200, { location, windows, nextWindow }, "Rain intelligence computed"));
});

export { getRainIntelligence };