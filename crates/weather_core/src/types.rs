use crate::sky::Sky;
use serde::Serialize;
use ts_rs::TS;

pub type Res<T> = Result<T, Box<dyn std::error::Error>>;

// ts-rs maps i64 to bigint; WMO codes are small, so they are exported as plain numbers.

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct Location {
    pub name: String,
    pub region: String,
    pub country: String,
    pub lat: f64,
    pub lon: f64,
    pub timezone: String,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct Weather {
    pub location: Location,
    pub timezone: String,
    pub utc_offset_seconds: i32,
    pub current: Current,
    pub today: Today,
    pub day_parts: DayParts,
    /// Next 48 hours, starting at the current hour.
    pub hourly: Vec<Hour>,
    pub daily: Vec<Day>,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct Current {
    pub temp_c: f64,
    pub wind_kmh: f64,
    pub wind_dir_deg: f64,
    pub humidity: f64,
    pub pressure_hpa: f64,
    pub dew_point_c: f64,
    pub visibility_m: Option<f64>,
    pub cloud_cover: f64,
    pub precip_mm: f64,
    pub rain_mm: f64,
    pub snowfall_cm: f64,
    #[ts(type = "number")]
    pub weather_code: i64,
    pub is_day: bool,
    pub sky: Sky,
    pub condition_text: String,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct Today {
    pub high_c: f64,
    pub low_c: f64,
    pub uv_index_max: f64,
    pub sunrise: String,
    pub sunset: String,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct DayPart {
    pub temp_c: f64,
    #[ts(type = "number")]
    pub weather_code: i64,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct DayParts {
    pub morning: DayPart,
    pub afternoon: DayPart,
    pub evening: DayPart,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct Hour {
    /// Local time, "YYYY-MM-DDTHH:00".
    pub time: String,
    pub temp_c: f64,
    #[ts(type = "number")]
    pub weather_code: i64,
    pub precip_prob: f64,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct Day {
    pub date: String,
    #[ts(type = "number")]
    pub code: i64,
    pub max: f64,
    pub min: f64,
}
