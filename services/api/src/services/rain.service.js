// Standard meteorological intensity bands, mm/hour
const classifyIntensity = (mmPerHour) => {
    if (mmPerHour <= 0) return "none";
    if (mmPerHour < 2.5) return "light";
    if (mmPerHour < 7.6) return "moderate";
    if (mmPerHour < 50) return "heavy";
    return "violent";
};

// OWM free tier gives 3-hour buckets — this is the finest granularity honestly available
// without a paid nowcasting API, so windows are expressed at 3-hour resolution.
const RAIN_POP_THRESHOLD = 0.3; // 30%+ chance counts as "likely to rain" for windowing

// hourlyBuckets: output of weather.service.js -> extractHourly()
const computeRainWindows = (hourlyBuckets) => {
    const windows = [];
    let current = null;

    for (const bucket of hourlyBuckets) {
        const isRaining = bucket.pop >= RAIN_POP_THRESHOLD || bucket.rain > 0;
        const mmPerHour = bucket.rain / 3; // 3h bucket -> hourly rate

        if (isRaining) {
            if (!current) {
                current = {
                    startDt: bucket.dt,
                    endDt: bucket.dt + 3 * 3600,
                    totalRainMm: bucket.rain,
                    maxPop: bucket.pop,
                    peakIntensity: classifyIntensity(mmPerHour),
                    buckets: [bucket],
                };
            } else {
                current.endDt = bucket.dt + 3 * 3600;
                current.totalRainMm += bucket.rain;
                current.maxPop = Math.max(current.maxPop, bucket.pop);
                const intensity = classifyIntensity(mmPerHour);
                if (rank(intensity) > rank(current.peakIntensity)) current.peakIntensity = intensity;
                current.buckets.push(bucket);
            }
        } else if (current) {
            windows.push(finalizeWindow(current));
            current = null;
        }
    }

    if (current) windows.push(finalizeWindow(current));

    return windows;
};

const rank = (intensity) => ({ none: 0, light: 1, moderate: 2, heavy: 3, violent: 4 })[intensity];

const finalizeWindow = (w) => ({
    start: w.startDt,
    end: w.endDt,
    durationHours: (w.endDt - w.startDt) / 3600,
    totalRainMm: Math.round(w.totalRainMm * 10) / 10,
    maxRainProbability: Math.round(w.maxPop * 100),
    peakIntensity: w.peakIntensity,
});

const getNextRainWindow = (hourlyBuckets) => {
    const windows = computeRainWindows(hourlyBuckets);
    const now = Math.floor(Date.now() / 1000);
    return windows.find((w) => w.end > now) || null;
};

export { computeRainWindows, getNextRainWindow, classifyIntensity };