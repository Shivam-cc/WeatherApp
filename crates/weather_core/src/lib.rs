//! UI-free weather logic: fetching, parsing, sky mapping, formatting.
mod api;
mod format;
mod parse;
mod sky;
mod types;

pub use api::{fetch, forecast, search};
pub use format::{MONTHS, WEEKDAYS, deg, parse_date};
pub use parse::{parse_locations, parse_weather};
pub use sky::{Sky, condition_text, sky};
pub use types::{Current, Day, DayPart, DayParts, Error, Hour, Location, Res, Today, Weather};
