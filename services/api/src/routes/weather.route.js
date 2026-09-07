import { Router } from "express";
import {
    getCurrentWeather,
    getHourlyForecast,
    getDailyForecast,
    getPrecipitation,
    searchLocation,
    getWeatherByGPS,
} from "../controllers/weather.controller.js";

const router = Router();

// all public — no auth needed to check weather
router.get("/current", getCurrentWeather);
router.get("/forecast/hourly", getHourlyForecast);
router.get("/forecast/daily", getDailyForecast);
router.get("/precipitation", getPrecipitation);
router.get("/search", searchLocation);
router.get("/gps", getWeatherByGPS);

export default router;