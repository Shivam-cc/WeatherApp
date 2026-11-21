use crate::parse::{parse_locations, parse_weather};
use crate::types::{Error, Location, Res, Weather};
use std::sync::OnceLock;
use std::time::Duration;

fn agent_with(global: Duration, connect: Duration) -> ureq::Agent {
    ureq::Agent::config_builder().timeout_global(Some(global)).timeout_connect(Some(connect)).build().into()
}

fn get_with(agent: &ureq::Agent, url: &str, query: &[(&str, &str)]) -> Res<String> {
    Ok(agent.get(url).query_pairs(query.iter().copied()).call()?.body_mut().read_to_string()?)
}

fn get(url: &str, query: &[(&str, &str)]) -> Res<String> {
    static AGENT: OnceLock<ureq::Agent> = OnceLock::new();
    get_with(AGENT.get_or_init(|| agent_with(Duration::from_secs(10), Duration::from_secs(5))), url, query)
}

pub fn fetch(city: &str) -> Res<Weather> {
    if city.is_empty() {
        return Err(Error::EmptyQuery);
    }
    forecast(search(city, 1)?.into_iter().next().ok_or(Error::NotFound)?)
}

/// Forecast for an already-resolved place (e.g. a picked search suggestion).
pub fn forecast(location: Location) -> Res<Weather> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;
    use std::time::Instant;

    #[test]
    fn stalled_server_times_out() {
        let l = TcpListener::bind("127.0.0.1:0").unwrap(); // accepts via the OS backlog, never replies
        let url = format!("http://{}/", l.local_addr().unwrap());
        let (t, start) = (Duration::from_millis(400), Instant::now());
        assert_eq!(get_with(&agent_with(t, t), &url, &[]), Err(Error::Timeout));
        assert!(start.elapsed() < Duration::from_secs(3));
    }

    #[test]
    fn unresolvable_host_is_offline() {
        let t = Duration::from_secs(5); // `.invalid` never resolves (RFC 2606); a refused port retries ~2s on Windows, so avoid it
        assert_eq!(get_with(&agent_with(t, t), "http://weather.invalid/", &[]), Err(Error::Offline));
    }
}

#[cfg(test)]
mod messages {
    use super::*;

    #[test]
    fn friendly_text_never_leaks_transport_errors() {
        let e: Error = ureq::Error::HostNotFound.into();
        assert_eq!(e.to_string(), "You appear to be offline.");
        assert_eq!(Error::from(ureq::Error::StatusCode(500)), Error::BadResponse);
        assert_eq!(Error::NotFound.to_string(), "City not found. Check the spelling and try again.");
    }
}
