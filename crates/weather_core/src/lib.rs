//! UI-free weather logic: fetching, parsing, sky mapping, formatting.
mod api;
mod format;
mod parse;
mod sky;
mod types;

pub use api::fetch;
pub use format::{MONTHS, WEEKDAYS, deg, parse_date};
pub use parse::{parse_location, parse_weather};
pub use sky::{Sky, sky};
pub use types::{Day, Res, Weather};
