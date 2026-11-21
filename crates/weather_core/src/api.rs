use crate::parse::{parse_location, parse_weather};
use crate::types::{Res, Weather};

fn get(url: &str, query: &[(&str, &str)]) -> Res<String> {
    Ok(ureq::get(url).query_pairs(query.iter().copied()).call()?.body_mut().read_to_string()?)
}

pub fn fetch(city: &str) -> Res<Weather> {
    if city.is_empty() {
        return Err("enter a city name".into());
    }
    let geo = get("https://geocoding-api.open-meteo.com/v1/search", &[("name", city), ("count", "1")])?;
    let (lat, lon, place) = parse_location(&geo)?;
    let (lat, lon) = (lat.to_string(), lon.to_string());
    let wx = get(
        "https://api.open-meteo.com/v1/forecast",
        &[
            ("latitude", &lat),
            ("longitude", &lon),
            ("current", "temperature_2m,wind_speed_10m,weather_code,is_day"),
            ("daily", "weather_code,temperature_2m_max,temperature_2m_min"),
            ("forecast_days", "5"),
            ("timezone", "auto"),
        ],
    )?;
    parse_weather(&wx, place)
}
