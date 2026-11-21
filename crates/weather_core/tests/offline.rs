use weather_core::*;

#[test]
fn parses_location() {
    let json = r#"{"results":[{"name":"London","country":"United Kingdom","latitude":51.5,"longitude":-0.12}]}"#;
    assert_eq!(parse_location(json).unwrap(), (51.5, -0.12, "London, United Kingdom".into()));
    assert!(parse_location(r#"{"generationtime_ms":0.1}"#).is_err());
}

#[test]
fn parses_weather() {
    let json = r#"{"current":{"temperature_2m":12.3,"wind_speed_10m":8.1,"weather_code":61,"is_day":0},
        "daily":{"time":["2026-11-20","2026-11-21"],"weather_code":[61,3],
                 "temperature_2m_max":[13.0,11.5],"temperature_2m_min":[7.2,5.0]}}"#;
    let w = parse_weather(json, "X".into()).unwrap();
    assert_eq!((w.temp, w.wind, w.code, w.is_day), (12.3, 8.1, 61, false));
    assert_eq!(w.days[1], Day { date: "2026-11-21".into(), code: 3, max: 11.5, min: 5.0 });
    assert!(parse_weather("{}", "X".into()).is_err());
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

#[test]
fn parses_location_list() {
    let json = r#"{"results":[{"name":"Paris","admin1":"Ile-de-France","country":"France","latitude":48.8,"longitude":2.3,"timezone":"Europe/Paris"},{"name":"bad"}]}"#;
    let v = parse_locations(json).unwrap();
    assert_eq!((v.len(), v[0].admin1.as_deref()), (1, Some("Ile-de-France")));
    assert!(parse_locations("{}").unwrap().is_empty());
}
