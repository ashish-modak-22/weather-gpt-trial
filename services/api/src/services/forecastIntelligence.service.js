const TEMP_AGREEMENT_THRESHOLD_C = 2; // sources within 2°C count as "agreeing"
const POP_AGREEMENT_THRESHOLD = 0.25; // sources within 25pp rain-probability count as "agreeing"

// Compares OWM's daily forecast against Open-Meteo's for the same days
const compareSources = (owmDaily, openMeteoDaily) => {
    const days = Math.min(owmDaily.length, openMeteoDaily.length);
    let agreeing = 0;
    const perDay = [];

    for (let i = 0; i < days; i++) {
        const a = owmDaily[i];
        const b = openMeteoDaily[i];

        const tempDiff = Math.abs(a.tempMax - b.tempMax);
        const popDiff = Math.abs(a.pop - b.pop);
        const agrees = tempDiff <= TEMP_AGREEMENT_THRESHOLD_C && popDiff <= POP_AGREEMENT_THRESHOLD;

        if (agrees) agreeing++;
        perDay.push({ day: i, tempDiff: Math.round(tempDiff * 10) / 10, popDiff: Math.round(popDiff * 100), agrees });
    }

    const agreementRatio = days ? agreeing / days : 0;

    return {
        sourcesCompared: 2,
        daysCompared: days,
        agreementCount: agreeing,
        agreementRatio: Math.round(agreementRatio * 100),
        perDay,
        confidence: confidenceFromAgreement(agreementRatio),
    };
};

const confidenceFromAgreement = (ratio) => {
    if (ratio >= 0.75) return "High";
    if (ratio >= 0.5) return "Medium";
    return "Low";
};

// Compares today's freshly-fetched daily forecast against the last stored snapshot
// for the same location to flag what changed since the last check.
const detectForecastChange = (previousDaily, currentDaily) => {
    if (!previousDaily || !previousDaily.length) {
        return { hasPrevious: false, changed: false, changes: [] };
    }

    const changes = [];
    const days = Math.min(previousDaily.length, currentDaily.length);

    for (let i = 0; i < days; i++) {
        const prev = previousDaily[i];
        const curr = currentDaily[i];

        const tempDelta = curr.tempMax - prev.tempMax;
        const popDelta = curr.pop - prev.pop;

        if (Math.abs(tempDelta) >= 2) {
            changes.push(`Day ${i + 1}: max temperature ${tempDelta > 0 ? "rose" : "dropped"} by ${Math.abs(tempDelta).toFixed(1)}°C`);
        }
        if (Math.abs(popDelta) >= 0.2) {
            changes.push(`Day ${i + 1}: rain probability ${popDelta > 0 ? "increased" : "decreased"} by ${Math.round(Math.abs(popDelta) * 100)}%`);
        }
    }

    return { hasPrevious: true, changed: changes.length > 0, changes };
};

// Simple trend read on the primary source's own daily series (rising/falling/steady)
const detectTrend = (owmDaily) => {
    if (owmDaily.length < 2) return "insufficient-data";

    const first = owmDaily[0].tempMax;
    const last = owmDaily[owmDaily.length - 1].tempMax;
    const delta = last - first;

    if (delta >= 2) return "warming";
    if (delta <= -2) return "cooling";
    return "steady";
};

const buildUncertaintyExplanation = (comparison, trend, changeDetection) => {
    const parts = [];

    parts.push(
        comparison.confidence === "High"
            ? `Both weather models agree closely (${comparison.agreementRatio}% of days) — this forecast is reliable.`
            : comparison.confidence === "Medium"
            ? `Weather models partially agree (${comparison.agreementRatio}% of days) — expect some variation from this forecast.`
            : `Weather models disagree on ${100 - comparison.agreementRatio}% of days — treat this forecast as uncertain.`
    );

    if (trend !== "insufficient-data" && trend !== "steady") {
        parts.push(`Temperatures are trending ${trend} over the forecast period.`);
    }

    if (changeDetection.changed) {
        parts.push(`This forecast has changed since it was last checked: ${changeDetection.changes.join("; ")}.`);
    }

    return parts.join(" ");
};

export { compareSources, detectForecastChange, detectTrend, buildUncertaintyExplanation };