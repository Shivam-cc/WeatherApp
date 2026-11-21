use crate::sky::{condition_text, sky};
use crate::types::{Error, Current, Day, DayPart, DayParts, Hour, Location, Res, Today, Weather};
use serde_json::Value;

pub fn parse_weather(json: &str, location: Location) -> Res<Weather> {
    let v: Value = serde_json::from_str(json)?;
    let bad = || Error::BadResponse;
    let (c, d, h) = (&v["current"], &v["daily"], &v["hourly"]);
    let num = |x: &Value| x.as_f64().ok_or_else(bad);
    let text = |x: &Value| x.as_str().map(str::to_owned).ok_or_else(bad);

    let code = c["weather_code"].as_i64().ok_or_else(bad)?;
    let daily = d["time"].as_array().ok_or_else(bad)?.iter().enumerate().map(|(i, date)| {
        Some(Day {
            date: date.as_str()?.to_owned(),
            code: d["weather_code"][i].as_i64()?,
            max: d["temperature_2m_max"][i].as_f64()?,
            min: d["temperature_2m_min"][i].as_f64()?,
        })
    });
    let daily: Vec<Day> = daily.collect::<Option<_>>().ok_or_else(bad)?;
    let first = daily.first().ok_or_else(bad)?.date.clone();

    let all: Vec<Hour> = h["time"]
        .as_array()
        .ok_or_else(bad)?
        .iter()
        .enumerate()
        .map(|(i, t)| {
            Some(Hour {
                time: t.as_str()?.to_owned(),
                temp_c: h["temperature_2m"][i].as_f64()?,
                weather_code: h["weather_code"][i].as_i64()?,
                precip_prob: h["precipitation_probability"][i].as_f64().unwrap_or(0.0),
            })
        })
        .collect::<Option<_>>()
        .ok_or_else(bad)?;

    // Day parts use today's local hours: average temperature, most frequent weather code.
    let part = |from: u32, to: u32| -> Res<DayPart> {
        let hs: Vec<&Hour> = all
            .iter()
            .filter(|x| x.time.starts_with(&first) && x.time.get(11..13).and_then(|t| t.parse().ok()).is_some_and(|t| (from..=to).contains(&t)))
            .collect();
        if hs.is_empty() {
            return Err(bad());
        }
        let mut counts: Vec<(i64, usize)> = vec![];
        for x in &hs {
            match counts.iter_mut().find(|(c, _)| *c == x.weather_code) {
                Some(e) => e.1 += 1,
                None => counts.push((x.weather_code, 1)),
            }
        }
        // Ties go to the earliest code seen.
        let weather_code = counts.iter().fold(counts[0], |b, &e| if e.1 > b.1 { e } else { b }).0;
        Ok(DayPart { temp_c: hs.iter().map(|x| x.temp_c).sum::<f64>() / hs.len() as f64, weather_code, sky: sky(weather_code) })
    };
    let day_parts = DayParts { morning: part(6, 11)?, afternoon: part(12, 17)?, evening: part(18, 22)? };

    // Hourly arrays start at midnight; find the current hour for the 48h window and visibility.
    let now = c["time"].as_str().and_then(|t| t.get(..13)).ok_or_else(bad)?;
    let start = all.iter().position(|x| x.time.get(..13) >= Some(now)).unwrap_or(0);
    let visibility_m = h["visibility"][start].as_f64();
    let hourly = all.into_iter().skip(start).take(48).collect();

    Ok(Weather {
        location,
        timezone: text(&v["timezone"])?,
        utc_offset_seconds: v["utc_offset_seconds"].as_i64().ok_or_else(bad)? as i32,
        current: Current {
            temp_c: num(&c["temperature_2m"])?,
            wind_kmh: num(&c["wind_speed_10m"])?,
            wind_dir_deg: num(&c["wind_direction_10m"])?,
            humidity: num(&c["relative_humidity_2m"])?,
            pressure_hpa: num(&c["pressure_msl"])?,
            dew_point_c: num(&c["dew_point_2m"])?,
            visibility_m,
            cloud_cover: num(&c["cloud_cover"])?,
            precip_mm: num(&c["precipitation"])?,
            rain_mm: num(&c["rain"])?,
            snowfall_cm: num(&c["snowfall"])?,
            weather_code: code,
            is_day: c["is_day"].as_i64().ok_or_else(bad)? == 1,
            sky: sky(code),
            condition_text: condition_text(code).to_owned(),
        },
        today: Today {
            high_c: daily[0].max,
            low_c: daily[0].min,
            uv_index_max: num(&d["uv_index_max"][0])?,
            sunrise: text(&d["sunrise"][0])?,
            sunset: text(&d["sunset"][0])?,
        },
        day_parts,
        hourly,
        daily,
    })
}

/// All geocoding hits; an absent `results` key means no match, not an error.
pub fn parse_locations(json: &str) -> Res<Vec<Location>> {
    let v: Value = serde_json::from_str(json)?;
    let s = |r: &Value, k: &str| r[k].as_str().unwrap_or_default().to_owned();
    Ok(v["results"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|r| {
                    Some(Location {
                        name: r["name"].as_str()?.to_owned(),
                        region: s(r, "admin1"),
                        country: s(r, "country"),
                        lat: r["latitude"].as_f64()?,
                        lon: r["longitude"].as_f64()?,
                        timezone: s(r, "timezone"),
                    })
                })
                .collect()
        })
        .unwrap_or_default())
}
