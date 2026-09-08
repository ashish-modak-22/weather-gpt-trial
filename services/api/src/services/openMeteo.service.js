import { ApiError } from "../utils/Async.js";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

// Open-Meteo needs no API key — used purely as a second model to cross-check OWM against.
const fetchOpenMeteoDaily = async (lat, lon) => {
    const url =
        `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
        `&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) throw new ApiError(res.status, data.reason || "Open-Meteo request failed");

    const { time, temperature_2m_max, temperature_2m_min, precipitation_probability_max, precipitation_sum } = data.daily;

    return time.map((date, i) => ({
        date,
        tempMax: temperature_2m_max[i],
        tempMin: temperature_2m_min[i],
        pop: (precipitation_probability_max[i] || 0) / 100,
        rain: precipitation_sum[i],
    }));
};

export { fetchOpenMeteoDaily };