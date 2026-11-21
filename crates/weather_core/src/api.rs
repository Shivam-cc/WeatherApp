use crate::parse::{parse_locations, parse_weather};
use crate::types::{Location, Res, Weather};

fn get(url: &str, query: &[(&str, &str)]) -> Res<String> {
    Ok(ureq::get(url).query_pairs(query.iter().copied()).call()?.body_mut().read_to_string()?)
}

pub fn fetch(city: &str) -> Res<Weather> {
    if city.is_empty() {
        return Err("enter a city name".into());
    }
    let location = search(city, 1)?.into_iter().next().ok_or("city not found")?;
    let (lat, lon) = (location.lat.to_string(), location.lon.to_string());
    let wx = get(
        "https://api.open-meteo.com/v1/forecast",
        &[
            ("latitude", &lat),
            ("longitude", &lon),
            ("current", "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day,relative_humidity_2m,pressure_msl,dew_point_2m,cloud_cover,precipitation,rain,snowfall"),
            ("hourly", "temperature_2m,weather_code,precipitation_probability,visibility"),
            ("daily", "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset"),
            ("forecast_days", "5"),
            ("timezone", "auto"),
        ],
    )?;
    parse_weather(&wx, location)
}

/// City suggestions for the search box.
pub fn search(query: &str, count: u8) -> Res<Vec<Location>> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    parse_locations(&get("https://geocoding-api.open-meteo.com/v1/search", &[("name", query.trim()), ("count", &count.to_string())])?)
}
