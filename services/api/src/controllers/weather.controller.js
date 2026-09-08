import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    resolveLocation,
    fetchOneCall,
    extractCurrent,
    extractHourly,
    extractDaily,
    extractPrecipitation,
} from "../services/weather.service.js";

// GET /current?city=|pincode=|lat=&lon=
const getCurrentWeather = asyncHandler(async (req, res) => {
    const location = await resolveLocation(req.query);
    const oneCall = await fetchOneCall(location.lat, location.lon);

    return res
        .status(200)
        .json(new ApiResponse(200, { location, current: extractCurrent(oneCall) }, "Current weather fetched"));
});

// GET /forecast/hourly?city=|pincode=|lat=&lon=
const getHourlyForecast = asyncHandler(async (req, res) => {
    const location = await resolveLocation(req.query);
    const oneCall = await fetchOneCall(location.lat, location.lon);

    return res
        .status(200)
        .json(new ApiResponse(200, { location, hourly: extractHourly(oneCall) }, "Hourly forecast fetched"));
});

// GET /forecast/daily?city=|pincode=|lat=&lon=
const getDailyForecast = asyncHandler(async (req, res) => {
    const location = await resolveLocation(req.query);
    const oneCall = await fetchOneCall(location.lat, location.lon);

    return res
        .status(200)
        .json(new ApiResponse(200, { location, daily: extractDaily(oneCall) }, "Daily forecast fetched"));
});

// GET /precipitation?city=|pincode=|lat=&lon=
const getPrecipitation = asyncHandler(async (req, res) => {
    const location = await resolveLocation(req.query);
    const oneCall = await fetchOneCall(location.lat, location.lon);

    return res
        .status(200)
        .json(new ApiResponse(200, { location, precipitation: extractPrecipitation(oneCall) }, "Precipitation data fetched"));
});

// GET /search?query=<city or pincode>  — location lookup only, no weather fetch
const searchLocation = asyncHandler(async (req, res) => {
    const { query, type = "city", country = "IN" } = req.query;

    if (!query) throw new ApiError(400, "query is required");

    const location =
        type === "pincode"
            ? await resolveLocation({ pincode: query, country })
            : await resolveLocation({ city: query, country });

    return res.status(200).json(new ApiResponse(200, location, "Location resolved"));
});

// GET /gps?lat=&lon=  — full weather bundle for device's current position
const getWeatherByGPS = asyncHandler(async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) throw new ApiError(400, "lat and lon are required");

    const location = await resolveLocation({ lat, lon });
    const oneCall = await fetchOneCall(lat, lon);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                location,
                current: extractCurrent(oneCall),
                hourly: extractHourly(oneCall).slice(0, 24),
                daily: extractDaily(oneCall),
            },
            "Weather fetched for current location"
        )
    );
});

export { getCurrentWeather, getHourlyForecast, getDailyForecast, getPrecipitation, searchLocation, getWeatherByGPS };