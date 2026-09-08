QUESTION_TEMPLATES = {
    "rain": "Explain, in plain language, why it will rain (or not) based on the data below.",
    "temperature": "Explain, in plain language, why the temperature will change as shown below.",
    "forecast_change": "Explain, in plain language, why the forecast changed since it was last checked.",
    "storm_warning": "Explain, in plain language, why there is a storm/severe-weather warning based on the data below.",
}


def build_explain_prompt(question_type: str, weather: dict, rain_intelligence: dict, forecast_intelligence: dict, now: str) -> str:
    instruction = QUESTION_TEMPLATES.get(question_type, QUESTION_TEMPLATES["rain"])

    loc = weather.get("location", {})
    current = weather.get("current", {})

    rain_windows = rain_intelligence.get("windows", [])
    rain_summary = (
        "\n".join(
            f"- {w['durationHours']}h window, {w['maxRainProbability']}% chance, "
            f"{w['totalRainMm']}mm total, intensity: {w['peakIntensity']}"
            for w in rain_windows
        )
        or "- no significant rain windows detected"
    )

    return f"""You are WeatherGPT's explanation engine. {instruction}
Be concise (3-5 sentences), avoid jargon, and ground every claim strictly in the data provided.
If the data doesn't support a confident answer, say so honestly instead of guessing.

Current time: {now}
Location: {loc.get('name')}, {loc.get('country')}

Current conditions:
- Temp: {current.get('temp')}°C, Condition: {current.get('description')}
- Pressure: {current.get('pressure')} hPa, Humidity: {current.get('humidity')}%

Rain windows detected:
{rain_summary}

Forecast intelligence:
- Confidence: {forecast_intelligence.get('confidence')}
- Model agreement: {forecast_intelligence.get('modelAgreement')}
- Trend: {forecast_intelligence.get('trend')}
- Forecast changed since last check: {forecast_intelligence.get('forecastChange', {}).get('changed')}
- Details of change: {"; ".join(forecast_intelligence.get('forecastChange', {}).get('changes', [])) or "none"}
"""