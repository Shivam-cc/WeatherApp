use weather_core::*;

const FORECAST: &str = include_str!("fixtures/forecast.json");

fn place() -> Location {
    Location { name: "London".into(), region: "England".into(), country: "United Kingdom".into(), lat: 51.5, lon: -0.12, timezone: "Europe/London".into() }
}

#[test]
fn parses_weather() {
    let w = parse_weather(FORECAST, place()).unwrap();
    let c = &w.current;
    assert_eq!((c.temp_c, c.wind_kmh, c.wind_dir_deg, c.humidity, c.pressure_hpa, c.dew_point_c), (12.3, 8.1, 240.0, 83.0, 1011.2, 9.5));
    assert_eq!((c.weather_code, c.is_day, c.sky, c.condition_text.as_str()), (61, false, Sky::Rain, "Rain"));
    assert_eq!((c.cloud_cover, c.precip_mm, c.rain_mm, c.snowfall_cm), (90.0, 0.4, 0.4, 0.0));
    assert_eq!((w.timezone.as_str(), w.utc_offset_seconds), ("Europe/London", 0));
    assert_eq!((w.today.high_c, w.today.low_c, w.today.uv_index_max), (13.0, 7.2, 1.5));
    assert_eq!((w.today.sunrise.as_str(), w.today.sunset.as_str()), ("2026-11-21T07:20", "2026-11-21T16:10"));
    assert_eq!(w.daily.len(), 5);
    assert_eq!(w.daily[1], Day { date: "2026-11-22".into(), code: 3, max: 11.5, min: 5.0 });
}

#[test]
fn hourly_window_starts_at_current_hour() {
    let w = parse_weather(FORECAST, place()).unwrap();
    assert_eq!(w.hourly.len(), 48);
    assert_eq!(w.hourly[0].time, "2026-11-21T15:00");
    assert_eq!(w.hourly[47].time, "2026-11-23T14:00");
    assert_eq!(w.current.visibility_m, Some(10015.0)); // the current hour's value
}

#[test]
fn computes_day_parts() {
    let p = parse_weather(FORECAST, place()).unwrap().day_parts;
    // Hours 6-11 / 12-17 / 18-22 have temps equal to the hour; codes: mostly 3, mostly 0, mostly 61.
    assert_eq!((p.morning.temp_c, p.morning.weather_code), (8.5, 3));
    assert_eq!((p.afternoon.temp_c, p.afternoon.weather_code), (14.5, 0));
    assert_eq!((p.evening.temp_c, p.evening.weather_code), (20.0, 61));
}

#[test]
fn rejects_incomplete_weather() {
    assert!(parse_weather("{}", place()).is_err());
    assert!(parse_weather(&FORECAST.replace("relative_humidity_2m", "x"), place()).is_err());
    assert!(parse_weather(&FORECAST.replace("uv_index_max", "x"), place()).is_err());
    // Without today's hours there is nothing to average for the day parts.
    assert!(parse_weather(&FORECAST.replace("2026-11-21T", "2026-11-20T"), place()).is_err());
}

#[test]
fn missing_visibility_is_none() {
    let w = parse_weather(&FORECAST.replace("\"visibility\"", "\"x\""), place()).unwrap();
    assert_eq!(w.current.visibility_m, None);
}

#[test]
fn parses_location_list() {
    let json = r#"{"results":[{"name":"Paris","admin1":"Ile-de-France","country":"France","latitude":48.8,"longitude":2.3,"timezone":"Europe/Paris"},{"name":"bad"}]}"#;
    let v = parse_locations(json).unwrap();
    assert_eq!((v.len(), v[0].region.as_str(), v[0].lat), (1, "Ile-de-France", 48.8));
    assert!(parse_locations("{}").unwrap().is_empty());
}

#[test]
fn formats_degrees() {
    assert_eq!((deg(-0.3), deg(-0.6), deg(21.5)), ("0°".into(), "-1°".into(), "22°".into()));
}

#[test]
fn parses_dates() {
    assert_eq!(parse_date("2026-11-20"), Some((5, 11, 20))); // Friday
    assert_eq!(parse_date("2024-02-29"), Some((4, 2, 29))); // Thursday, leap day
    assert_eq!(parse_date("2025-01-01"), Some((3, 1, 1))); // Wednesday, January uses the year shift
    assert_eq!(parse_date("2026-13-01"), None);
    assert_eq!(parse_date("nope"), None);
}

#[test]
fn maps_codes_to_sky() {
    let cases = [(0, Sky::Clear), (2, Sky::Cloudy), (45, Sky::Fog), (63, Sky::Rain), (81, Sky::Rain), (75, Sky::Snow), (86, Sky::Snow), (95, Sky::Thunderstorm)];
    for (code, want) in cases {
        assert_eq!(sky(code), want, "code {code}");
    }
}

