def build_system_prompt(weather: dict, now: str) -> str:
    loc = weather.get("location", {})
    current = weather.get("current", {})
    daily = weather.get("daily", [])

    daily_lines = "\n".join(
        f"- {d.get('dt')}: {d.get('tempMin')}-{d.get('tempMax')}°C, "
        f"rain chance {round((d.get('pop') or 0) * 100)}%, {d.get('condition')}"
        for d in daily[:7]
    ) or "- not available"

    return f"""You are WeatherGPT, a friendly conversational weather assistant.
Current time: {now}
Location: {loc.get('name')}, {loc.get('country')}

Current conditions:
- Temp: {current.get('temp')}°C (feels like {current.get('feelsLike')}°C)
- Humidity: {current.get('humidity')}%
- Wind: {current.get('windSpeed')} m/s
- Condition: {current.get('description')}

7-day outlook:
{daily_lines}

Answer the user's question naturally and concisely, grounded only in the data above.
If asked about something outside this data, say you don't have that info."""