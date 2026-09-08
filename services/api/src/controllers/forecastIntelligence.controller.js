import { ApiResponse } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolveLocation, fetchOneCall, extractDaily } from "../services/weather.service.js";
import { fetchOpenMeteoDaily } from "../services/openMeteo.service.js";
import { ForecastSnapshot, toLocationKey } from "../models/forecastSnapshot.model.js";
import { compareSources, detectForecastChange, detectTrend, buildUncertaintyExplanation } from "../services/forecastIntelligence.service.js";

// GET /forecast-intelligence?city=|pincode=|lat=&lon=
const getForecastIntelligence = asyncHandler(async (req, res) => {
    const location = await resolveLocation(req.query);

    const [oneCall, openMeteoDaily] = await Promise.all([
        fetchOneCall(location.lat, location.lon),
        fetchOpenMeteoDaily(location.lat, location.lon),
    ]);

    const owmDaily = extractDaily(oneCall);
    const locationKey = toLocationKey(location.lat, location.lon);

    // pull the most recent snapshot BEFORE we write a new one, so we're comparing old vs new
    const previousSnapshot = await ForecastSnapshot.findOne({ locationKey }).sort({ fetchedAt: -1 });

    const comparison = compareSources(owmDaily, openMeteoDaily);
    const trend = detectTrend(owmDaily);
    const changeDetection = detectForecastChange(previousSnapshot?.daily, owmDaily);
    const uncertaintyExplanation = buildUncertaintyExplanation(comparison, trend, changeDetection);

    await ForecastSnapshot.create({ locationKey, daily: owmDaily });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                location,
                confidence: comparison.confidence,
                modelAgreement: `${comparison.agreementCount}/${comparison.daysCompared} sources`,
                trend,
                forecastChange: changeDetection,
                uncertaintyExplanation,
            },
            "Forecast intelligence computed"
        )
    );
});

export { getForecastIntelligence };