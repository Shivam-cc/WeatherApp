pub const WEEKDAYS: [&str; 7] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
pub const MONTHS: [&str; 12] = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
];

/// "2026-11-20" -> (weekday 0=Sunday, month 1..=12, day). Sakamoto's method, so no date crate is needed.
pub fn parse_date(date: &str) -> Option<(usize, usize, u32)> {
    let mut it = date.split('-').map(|x| x.parse::<i32>().ok());
    let (mut y, m, d) = (it.next()??, it.next()??, it.next()??);
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    let t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    y -= (m < 3) as i32;
    let w = (y + y / 4 - y / 100 + y / 400 + t[m as usize - 1] + d).rem_euclid(7);
    Some((w as usize, m as usize, d as u32))
}

/// Whole degrees; `+ 0.0` turns -0 into 0 so -0.3 shows as "0°".
pub fn deg(v: f64) -> String {
    format!("{:.0}°", v.round() + 0.0)
}
