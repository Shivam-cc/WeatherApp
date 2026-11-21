use serde::Serialize;
use ts_rs::TS;

pub type Res<T> = Result<T, Box<dyn std::error::Error>>;

#[derive(Debug, PartialEq, Serialize, TS)]
#[ts(export)]
pub struct Weather {
    pub place: String,
    pub temp: f64,
    pub wind: f64,
    #[ts(type = "number")]
    pub code: i64,
    pub is_day: bool,
    pub days: Vec<Day>,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[ts(export)]
pub struct Day {
    pub date: String,
    #[ts(type = "number")]
    pub code: i64,
    pub max: f64,
    pub min: f64,
}

#[derive(Debug, PartialEq, Serialize, TS)]
#[ts(export)]
pub struct Location {
    pub name: String,
    pub admin1: Option<String>,
    pub country: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub timezone: Option<String>,
}
