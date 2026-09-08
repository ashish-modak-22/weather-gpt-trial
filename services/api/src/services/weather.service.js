import { ApiError } from "../utils/Async.js";

const OWM_BASE = "https://api.openweathermap.org";

const getApiKey = () => {
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) throw new ApiError(500, "OPENWEATHER_API_KEY not configured");
    return key;
};

// city / pincode -> { lat, lon, name }
const geocodeByCity = async (query, countryCode = "IN") => {
    const key = getApiKey();
    const url = `${OWM_BASE}/geo/1.0/direct?q=${encodeURIComponent(query)},${countryCode}&limit=1&appid=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) throw new ApiError(res.status, "Geocoding request failed");
    if (!data.length) throw new ApiError(404, `No location found for "${query}"`);

    return { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country };
};

const geocodeByPincode = async (pincode, countryCode = "IN") => {
    const key = getApiKey();
    const url = `${OWM_BASE}/geo/1.0/zip?zip=${pincode},${countryCode}&appid=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) throw new ApiError(404, `No location found for pincode "${pincode}"`);

    return { lat: data.lat, lon: data.lon, name: data.name, country: data.country };
};

// GPS coords -> place name
const reverseGeocode = async (lat, lon) => {
    const key = getApiKey();
    const url = `${OWM_BASE}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.length) throw new ApiError(404, "Could not resolve location for given coordinates");

    return { lat, lon, name: data[0].name, country: data[0].country };
};

// Shared across weather/rain/forecast-intelligence controllers:
// resolve any {city|pincode|lat+lon} query into { lat, lon, name }
const resolveLocation = async (query) => {
    const { city, pincode, lat, lon } = query;

    if (lat && lon) return reverseGeocode(lat, lon);
    if (pincode) return geocodeByPincode(pincode, query.country || "IN");
    if (city) return geocodeByCity(city, query.country || "IN");

    throw new ApiError(400, "Provide city, pincode, or lat+lon");
};

// Free tier: current + 5-day/3-hour forecast, no subscription needed
const fetchOneCall = async (lat, lon) => {
    const key = getApiKey();
    const currentUrl = `${OWM_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
    const forecastUrl = `${OWM_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;

    const [currentRes, forecastRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    if (!currentRes.ok) throw new ApiError(currentRes.status, current.message || "Weather data fetch failed");
    if (!forecastRes.ok) throw new ApiError(forecastRes.status, forecast.message || "Forecast fetch failed");

    return { current, forecastList: forecast.list };
};

const extractCurrent = ({ current: c }) => ({
    temp: c.main.temp,
    feelsLike: c.main.feels_like,
    humidity: c.main.humidity,
    pressure: c.main.pressure,
    windSpeed: c.wind.speed,
    windDeg: c.wind.deg,
    clouds: c.clouds.all,
    visibility: c.visibility,
    condition: c.weather?.[0]?.main,
    description: c.weather?.[0]?.description,
    icon: c.weather?.[0]?.icon,
    sunrise: c.sys.sunrise,
    sunset: c.sys.sunset,
    dt: c.dt,
});

const extractHourly = ({ forecastList }) =>
    forecastList.map((h) => ({
        dt: h.dt,
        temp: h.main.temp,
        feelsLike: h.main.feels_like,
        humidity: h.main.humidity,
        windSpeed: h.wind.speed,
        pop: h.pop,
        rain: h.rain?.["3h"] || 0,
        condition: h.weather?.[0]?.main,
        icon: h.weather?.[0]?.icon,
    }));

// group 3-hour steps into daily min/max
const extractDaily = ({ forecastList }) => {
    const byDay = {};
    forecastList.forEach((h) => {
        const day = h.dt_txt.split(" ")[0];
        byDay[day] ??= { temps: [], pop: 0, rain: 0, dt: h.dt, condition: h.weather?.[0]?.main, icon: h.weather?.[0]?.icon };
        byDay[day].temps.push(h.main.temp);
        byDay[day].pop = Math.max(byDay[day].pop, h.pop);
        byDay[day].rain += h.rain?.["3h"] || 0;
    });
    return Object.values(byDay).map((d) => ({
        dt: d.dt,
        tempMin: Math.min(...d.temps),
        tempMax: Math.max(...d.temps),
        pop: d.pop,
        rain: d.rain,
        condition: d.condition,
        icon: d.icon,
    }));
};

const extractPrecipitation = (data) => ({
    hourly: data.forecastList.slice(0, 8).map((h) => ({ dt: h.dt, pop: h.pop, rain: h.rain?.["3h"] || 0 })),
    daily: extractDaily(data).map((d) => ({ dt: d.dt, pop: d.pop, rain: d.rain })),
});

export {
    geocodeByCity,
    geocodeByPincode,
    reverseGeocode,
    resolveLocation,
    fetchOneCall,
    extractCurrent,
    extractHourly,
    extractDaily,
    extractPrecipitation,
};