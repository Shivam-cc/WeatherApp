pub type Res<T> = Result<T, Box<dyn std::error::Error>>;

#[derive(Debug, PartialEq)]
pub struct Weather {
    pub place: String,
    pub temp: f64,
    pub wind: f64,
    pub code: i64,
    pub is_day: bool,
    pub days: Vec<Day>,
}

#[derive(Debug, PartialEq)]
pub struct Day {
    pub date: String,
    pub code: i64,
    pub max: f64,
    pub min: f64,
}
