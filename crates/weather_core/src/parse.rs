use crate::types::{Day, Location, Res, Weather};
use serde_json::Value;

pub fn parse_location(json: &str) -> Res<(f64, f64, String)> {
    let v: Value = serde_json::from_str(json)?;
    let r = &v["results"][0];
    let (Some(lat), Some(lon)) = (r["latitude"].as_f64(), r["longitude"].as_f64()) else {
        return Err("city not found".into());
    };
    let name = r["name"].as_str().unwrap_or("?");
    let country = r["country"].as_str().unwrap_or("");
    Ok((lat, lon, format!("{name}, {country}")))
}

pub fn parse_weather(json: &str, place: String) -> Res<Weather> {
    let v: Value = serde_json::from_str(json)?;
    let bad = || "unexpected weather response";
    let (c, d) = (&v["current"], &v["daily"]);
    let days = d["time"].as_array().ok_or_else(bad)?.iter().enumerate().map(|(i, date)| {
        Some(Day {
            date: date.as_str()?.to_owned(),
            code: d["weather_code"][i].as_i64()?,
            max: d["temperature_2m_max"][i].as_f64()?,
            min: d["temperature_2m_min"][i].as_f64()?,
        })
    });
    Ok(Weather {
        place,
        temp: c["temperature_2m"].as_f64().ok_or_else(bad)?,
        wind: c["wind_speed_10m"].as_f64().ok_or_else(bad)?,
        code: c["weather_code"].as_i64().ok_or_else(bad)?,
        is_day: c["is_day"].as_i64().ok_or_else(bad)? == 1,
        days: days.collect::<Option<_>>().ok_or_else(bad)?,
    })
}

/// All geocoding hits; an absent `results` key means no match, not an error.
pub fn parse_locations(json: &str) -> Res<Vec<Location>> {
    let v: Value = serde_json::from_str(json)?;
    let s = |r: &Value, k: &str| r[k].as_str().map(str::to_owned);
    Ok(v["results"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|r| {
                    Some(Location {
                        name: s(r, "name")?,
                        admin1: s(r, "admin1"),
                        country: s(r, "country"),
                        latitude: r["latitude"].as_f64()?,
                        longitude: r["longitude"].as_f64()?,
                        timezone: s(r, "timezone"),
                    })
                })
                .collect()
        })
        .unwrap_or_default())
}
