#[derive(Debug, Clone, Copy, PartialEq)]
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
