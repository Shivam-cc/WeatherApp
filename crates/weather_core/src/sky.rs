#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, ts_rs::TS)]
#[ts(export)]
pub enum Sky {
    Clear,
    Cloudy,
    Fog,
    Rain,
    Snow,
    Thunderstorm,
}

// WMO weather codes, as used by Open-Meteo.
pub fn sky(code: i64) -> Sky {
    match code {
        0 => Sky::Clear,
        45 | 48 => Sky::Fog,
        51..=67 | 80..=82 => Sky::Rain,
        71..=77 | 85 | 86 => Sky::Snow,
        95..=99 => Sky::Thunderstorm,
        _ => Sky::Cloudy,
    }
}

/// Human label for a WMO code.
pub fn condition_text(code: i64) -> &'static str {
    match code {
        0 => "Clear",
        1 => "Mostly clear",
        2 => "Partly cloudy",
        3 => "Overcast",
        45 | 48 => "Fog",
        51..=57 => "Drizzle",
        61..=67 => "Rain",
        71..=77 => "Snow",
        80..=82 => "Showers",
        85 | 86 => "Snow showers",
        95..=99 => "Thunderstorm",
        _ => "Cloudy",
    }
}
