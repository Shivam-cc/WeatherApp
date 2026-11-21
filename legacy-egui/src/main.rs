use eframe::egui::{self, pos2, vec2, Align, Align2, Color32, FontId, Layout, Painter, Rect, RichText, Sense, Shape, Stroke};
use std::f32::consts::{PI, TAU};
use weather_core::{Day, Sky, Weather, WEEKDAYS, MONTHS, deg, fetch, parse_date, sky};
use std::sync::mpsc::{channel, Receiver};

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([1000.0, 620.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Weather",
        options,
        Box::new(|cc| {
            cc.egui_ctx.set_visuals(egui::Visuals::dark());
            Ok(Box::new(App::default()))
        }),
    )
}

#[derive(Default)]
struct App {
    city: String,
    status: String,
    weather: Option<Weather>,
    pending: Option<Receiver<Result<Weather, String>>>,
}

fn sky_colors(w: Option<&Weather>) -> (Color32, Color32) {
    let Some(w) = w else {
        return (Color32::from_rgb(35, 45, 65), Color32::from_rgb(60, 70, 90));
    };
    let ((r1, g1, b1), (r2, g2, b2)) = match sky(w.code) {
        Sky::Clear => ((70, 140, 220), (240, 190, 140)),
        Sky::Cloudy => ((110, 130, 155), (200, 175, 150)),
        Sky::Fog => ((160, 165, 170), (200, 200, 200)),
        Sky::Rain => ((55, 70, 90), (100, 105, 115)),
        Sky::Snow => ((170, 185, 205), (230, 235, 240)),
        Sky::Thunderstorm => ((30, 32, 40), (90, 70, 60)),
    };
    let k = if w.is_day { 1.0 } else { 0.3 };
    let rgb = |r: u8, g: u8, b: u8| Color32::from_rgb((r as f32 * k) as u8, (g as f32 * k) as u8, (b as f32 * k) as u8);
    (rgb(r1, g1, b1), rgb(r2, g2, b2))
}

/// Dark text on bright skies, white text on dark ones.
fn ink(top: Color32, bot: Color32) -> Color32 {
    let l = |c: Color32| 0.3 * c.r() as f32 + 0.59 * c.g() as f32 + 0.11 * c.b() as f32;
    if (l(top) + l(bot)) / 2.0 > 150.0 { Color32::from_rgb(35, 35, 45) } else { Color32::WHITE }
}

fn glass(ink: Color32) -> egui::Frame {
    let fill = if ink == Color32::WHITE { Color32::from_black_alpha(70) } else { Color32::from_white_alpha(70) };
    egui::Frame::new()
        .fill(fill)
        .stroke(Stroke::new(1.0, Color32::from_white_alpha(40)))
        .corner_radius(14.0)
        .inner_margin(egui::Margin::symmetric(12, 6))
}

impl eframe::App for App {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        if let Some(Ok(msg)) = self.pending.as_ref().map(|rx| rx.try_recv()) {
            match msg {
                Ok(w) => (self.weather, self.status) = (Some(w), String::new()),
                Err(e) => self.status = format!("Error: {e}"),
            }
            self.pending = None;
        }
        let t = ui.input(|i| i.time) as f32;
        let (top, bot) = sky_colors(self.weather.as_ref());
        let ink = ink(top, bot);
        let soft = ink.gamma_multiply(0.7);

        egui::CentralPanel::default().frame(egui::Frame::NONE.inner_margin(28.0)).show(ui, |ui| {
            paint_sky(ui.painter(), ui.clip_rect(), self.weather.as_ref(), t, top, bot);

            ui.horizontal(|ui| {
                if let Some(w) = &self.weather {
                    let date = w.days.first().and_then(|d| parse_date(&d.date));
                    let date = date.map(|(wd, m, d)| format!("   {}, {} {d}", WEEKDAYS[wd], MONTHS[m - 1])).unwrap_or_default();
                    ui.label(RichText::new(format!("{}{date}", w.place)).size(16.0).color(ink));
                }
                ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                    let idle = self.pending.is_none();
                    // Right-to-left row: the text box is added first, so the magnifier sits to its left.
                    let (edit, icon) = glass(ink)
                        .show(ui, |ui| {
                            let edit = ui.add(
                                egui::TextEdit::singleline(&mut self.city).hint_text(RichText::new("Search city").color(soft)).text_color(ink).desired_width(220.0).frame(egui::Frame::NONE),
                            );
                            let (rect, icon) = ui.allocate_exact_size(vec2(18.0, 18.0), Sense::click());
                            let icon = icon.on_hover_cursor(egui::CursorIcon::PointingHand).on_hover_text("Search");
                            let color = if icon.hovered() { ink } else { soft };
                            let c = rect.center() - vec2(2.0, 2.0);
                            ui.painter().circle_stroke(c, 5.5, Stroke::new(1.8, color));
                            ui.painter().line_segment([c + vec2(4.0, 4.0), c + vec2(8.5, 8.5)], Stroke::new(2.2, color));
                            (edit, icon)
                        })
                        .inner;
                    let clicked = icon.clicked();
                    let enter = edit.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
                    if (clicked || enter) && idle {
                        let (tx, rx) = channel();
                        let (city, ctx) = (self.city.trim().to_owned(), ctx.clone());
                        // Fetch off the UI thread so the window stays responsive.
                        std::thread::spawn(move || {
                            let _ = tx.send(fetch(&city).map_err(|e| e.to_string()));
                            ctx.request_repaint();
                        });
                        self.pending = Some(rx);
                        self.status = "Loading…".into();
                    }
                });
            });
            if !self.status.is_empty() {
                ui.label(RichText::new(&self.status).color(soft));
            }

            let Some(w) = &self.weather else {
                ui.add_space(160.0);
                ui.vertical_centered(|ui| ui.label(RichText::new("Search a city to see its weather").size(28.0).color(soft)));
                return;
            };
            ui.add_space(30.0);
            ui.horizontal(|ui| {
                ui.label(RichText::new(deg(w.temp)).size(110.0).color(ink));
                if let Some(d) = w.days.first() {
                    ui.vertical(|ui| {
                        ui.add_space(28.0);
                        for (k, v) in [("H", d.max), ("L", d.min)] {
                            glass(ink).show(ui, |ui| ui.label(RichText::new(format!("{k}   {}", deg(v))).size(16.0).color(ink)));
                        }
                    });
                }
            });
            let mut headline = format!("{:?}", sky(w.code));
            if !w.is_day {
                headline += " night";
            }
            if w.wind > 30.0 {
                headline += ", windy";
            }
            ui.label(RichText::new(headline).size(52.0).color(ink));
            ui.label(RichText::new(format!("Wind {} km/h", w.wind)).size(16.0).color(soft));

            let r = ui.max_rect();
            paint_forecast(ui.painter(), Rect::from_min_max(pos2(r.left(), r.bottom() - 180.0), r.right_bottom()), &w.days, ink);
        });
        if self.weather.is_some() {
            ctx.request_repaint(); // keep the background animating
        }
    }
}

/// Weekday names, a smooth curve through the daily highs, and the temperatures; today is highlighted.
fn paint_forecast(p: &Painter, r: Rect, days: &[Day], ink: Color32) {
    if days.is_empty() {
        return;
    }
    let col = r.width() / days.len() as f32;
    let xs: Vec<f32> = (0..days.len()).map(|i| r.left() + col * (i as f32 + 0.5)).collect();
    let (lo, hi) = days.iter().fold((f64::MAX, f64::MIN), |(lo, hi), d| (lo.min(d.max), hi.max(d.max)));
    let (cy0, cy1) = (r.top() + 50.0, r.top() + 105.0);
    let ys: Vec<f32> = days.iter().map(|d| cy1 - ((d.max - lo) / (hi - lo).max(1.0)) as f32 * (cy1 - cy0)).collect();

    let mut pts = vec![pos2(r.left() - 28.0, ys[0]), pos2(xs[0], ys[0])];
    for i in 1..xs.len() {
        for k in 1..=24 {
            let f = k as f32 / 24.0;
            let ease = (1.0 - (std::f32::consts::PI * f).cos()) / 2.0;
            pts.push(pos2(xs[i - 1] + col * f, ys[i - 1] + (ys[i] - ys[i - 1]) * ease));
        }
    }
    pts.push(pos2(r.right() + 28.0, *ys.last().unwrap()));
    p.add(Shape::line(pts, Stroke::new(2.0, ink.gamma_multiply(0.8))));

    for (i, d) in days.iter().enumerate() {
        let color = if i == 0 { ink } else { ink.gamma_multiply(0.55) };
        let name = if i == 0 { "Today" } else { parse_date(&d.date).map_or(d.date.as_str(), |(wd, ..)| WEEKDAYS[wd]) };
        p.text(pos2(xs[i], r.top() + 15.0), Align2::CENTER_CENTER, name, FontId::proportional(18.0), color);
        p.text(pos2(xs[i], r.bottom() - 48.0), Align2::CENTER_CENTER, deg(d.max), FontId::proportional(32.0), color);
        p.text(pos2(xs[i], r.bottom() - 15.0), Align2::CENTER_CENTER, deg(d.min), FontId::proportional(15.0), ink.gamma_multiply(0.45));
    }
    let today = pos2(xs[0], ys[0]);
    p.extend(Shape::dashed_line(&[today, pos2(xs[0], r.bottom() - 70.0)], Stroke::new(1.0, ink.gamma_multiply(0.5)), 4.0, 4.0));
    for (rad, a) in [(16.0, 30), (9.0, 70), (4.5, 255)] {
        p.circle_filled(today, rad, Color32::from_white_alpha(a));
    }
}

fn paint_sky(p: &Painter, r: Rect, w: Option<&Weather>, t: f32, top: Color32, bot: Color32) {
    let mut mesh = egui::Mesh::default();
    for (pos, c) in [(r.left_top(), top), (r.right_top(), top), (r.right_bottom(), bot), (r.left_bottom(), bot)] {
        mesh.colored_vertex(pos, c);
    }
    mesh.add_triangle(0, 1, 2);
    mesh.add_triangle(0, 2, 3);
    p.add(mesh);
    let Some(w) = w else { return };
    let (s, day, wind) = (sky(w.code), w.is_day, w.wind as f32);
    let (width, height) = (r.width(), r.height());
    let at = |fx: f32, fy: f32| pos2(r.left() + fx * width, r.top() + fy * height);
    let rgba = Color32::from_rgba_unmultiplied;

    // Stars twinkle each at their own pace, with an occasional shooting star.
    if !day && matches!(s, Sky::Clear | Sky::Cloudy) {
        for i in 0..140 {
            let b = rnd(i, 3) * rnd(i, 3);
            let twinkle = 0.65 + 0.35 * (t * (0.6 + 2.0 * rnd(i, 5)) + TAU * rnd(i, 7)).sin();
            p.circle_filled(at(rnd(i, 11), rnd(i, 13) * 0.75), 0.6 + 1.4 * b, Color32::from_white_alpha((40.0 + 215.0 * b * twinkle) as u8));
        }
        let slot = (t / 9.0).floor() as u32;
        let local = t - slot as f32 * 9.0 - rnd(slot, 17) * 5.0;
        if (0.0..0.9).contains(&local) {
            let dir = vec2(1.0, 0.35).normalized();
            let head = at(0.15 + 0.5 * rnd(slot, 19), 0.05 + 0.25 * rnd(slot, 23)) + dir * local * 700.0;
            for k in 0..14 {
                let a = (1.0 - k as f32 / 14.0) * (1.0 - local / 0.9) * 230.0;
                let q = head - dir * (k as f32 * 8.0);
                p.line_segment([q, q - dir * 8.0], Stroke::new(1.6, Color32::from_white_alpha(a as u8)));
            }
        }
    }

    // Sun and moon with soft halos.
    let orb = r.right_top() + vec2(-150.0, 160.0);
    if matches!(s, Sky::Clear | Sky::Cloudy) {
        if day {
            glow(p, orb, vec2(230.0, 230.0), rgba(255, 215, 150, 90));
            glow(p, orb, vec2(90.0, 90.0), rgba(255, 240, 200, 170));
            p.circle_filled(orb, 36.0, Color32::from_rgb(255, 246, 218));
        } else {
            glow(p, orb, vec2(150.0, 150.0), rgba(190, 205, 255, 45));
            p.circle_filled(orb, 30.0, Color32::from_rgb(232, 232, 218));
            for (d, rad) in [(vec2(-9.0, -6.0), 6.0), (vec2(9.0, 5.0), 4.0), (vec2(-2.0, 12.0), 3.0)] {
                p.circle_filled(orb + d, rad, Color32::from_rgb(208, 208, 192));
            }
        }
    }

    // Clouds: soft puffs with a darker underside; far layers are smaller, fainter and slower (parallax).
    let (count, base, alpha) = match s {
        Sky::Clear => (2, 240.0, 60.0),
        Sky::Cloudy => (8, 225.0, 170.0),
        Sky::Fog => (0, 0.0, 0.0),
        Sky::Rain => (12, 125.0, 210.0),
        Sky::Thunderstorm => (14, 75.0, 235.0),
        Sky::Snow => (10, 205.0, 190.0),
    };
    let base = if day { base } else { base * 0.35 };
    for i in 0..count {
        let z = 0.45 + 0.55 * i as f32 / count as f32; // later clouds are nearer
        let cw = 300.0 * z;
        let x = r.left() + wrap(rnd(i, 31) * width + t * (5.0 + wind * 1.5) * z, width, cw);
        let y = r.top() + height * (0.04 + 0.38 * rnd(i, 37));
        let a = alpha * z;
        for j in 0..9 {
            let id = i * 16 + j;
            let dx = (rnd(id, 41) - 0.5) * cw;
            let dome = (1.0 - (2.0 * dx / cw).powi(2)).max(0.0) * cw * 0.12;
            let c = pos2(x + dx, y + (rnd(id, 43) - 0.5) * cw * 0.15 - dome);
            let pr = cw * (0.17 + 0.13 * rnd(id, 47));
            let shade = (base * 0.72) as u8;
            glow(p, c + vec2(0.0, pr * 0.3), vec2(pr * 1.15, pr * 0.8), rgba(shade, shade, shade.saturating_add(8), (a * 0.8) as u8));
            glow(p, c, vec2(pr, pr * 0.75), rgba(base as u8, base as u8, (base as u8).saturating_add(6), a as u8));
        }
    }

    match s {
        Sky::Fog => {
            for i in 0..12 {
                let z = 0.4 + 0.6 * rnd(i, 53);
                let x = r.left() + wrap(rnd(i, 55) * width + t * (4.0 + wind) * z, width, 400.0);
                let c = pos2(x, r.top() + height * (0.15 + 0.8 * rnd(i, 57)));
                glow(p, c, vec2(120.0 + 380.0 * z, 30.0 + 70.0 * z), rgba(235, 235, 240, (30.0 + 60.0 * z) as u8));
            }
        }
        Sky::Rain | Sky::Thunderstorm => {
            let slant = (wind / 45.0).clamp(0.0, 0.9); // sideways px per px fallen
            for i in 0..if s == Sky::Thunderstorm { 420 } else { 320 } {
                let z = rnd(i, 61).powf(1.5); // most drops are far away
                let len = 8.0 + 26.0 * z;
                let y = r.top() + wrap(rnd(i, 63) * height + t * (700.0 + 900.0 * z), height, len);
                let x = r.left() + wrap(rnd(i, 65) * width + (y - r.top()) * slant, width, 40.0);
                let drop = Stroke::new(0.6 + 0.9 * z, rgba(200, 215, 240, (25.0 + 110.0 * z) as u8));
                p.line_segment([pos2(x, y), pos2(x + slant * len, y + len)], drop);
            }
            for i in 0..60 {
                let cycle = t * 2.2 + rnd(i, 67);
                let ph = cycle.fract();
                let c = pos2(r.left() + rnd(i * 977 + cycle as u32, 69) * width, r.bottom() - 4.0 - rnd(i, 71) * 30.0);
                let rad = 2.0 + 9.0 * ph;
                p.add(Shape::ellipse_stroke(c, vec2(rad, rad * 0.3), Stroke::new(1.0, rgba(210, 220, 240, ((1.0 - ph) * 120.0) as u8))));
            }
        }
        Sky::Snow => {
            for i in 0..260 {
                let z = rnd(i, 73);
                let rad = 0.8 + 2.6 * z;
                let y = r.top() + wrap(rnd(i, 75) * height + t * (18.0 + 55.0 * z), height, 10.0);
                let flutter = (t * (0.4 + 0.9 * rnd(i, 77)) + TAU * rnd(i, 79)).sin() * (8.0 + 22.0 * z);
                let c = pos2(r.left() + wrap(rnd(i, 81) * width + flutter + t * wind * 1.5 * z, width, 20.0), y);
                let a = 120.0 + 135.0 * z;
                glow(p, c, vec2(rad * 2.8, rad * 2.8), Color32::from_white_alpha((a * 0.3) as u8));
                p.circle_filled(c, rad, Color32::from_white_alpha(a as u8));
            }
        }
        _ => {}
    }

    // Wind: curved gust trails that fade in and out as they cross.
    if wind > 25.0 {
        for i in 0..14 {
            let cycle = t / (2.5 + 2.0 * rnd(i, 83)) + rnd(i, 85);
            let (ph, n) = (cycle.fract(), cycle as u32);
            let len = 140.0 + 120.0 * rnd(i, 87);
            let y0 = r.top() + height * rnd(i * 31 + n, 89);
            let head = r.left() - len + ph * (width + 2.0 * len);
            let fade = (ph * PI).sin();
            let pt = |f: f32| pos2(head - len * (1.0 - f), y0 + (f * TAU * 0.8 + t).sin() * 6.0);
            for k in 0..16 {
                let (f0, f1) = (k as f32 / 16.0, (k + 1) as f32 / 16.0);
                p.line_segment([pt(f0), pt(f1)], Stroke::new(1.5, Color32::from_white_alpha((f1 * fade * 90.0) as u8)));
            }
        }
    }

    // Lightning at random moments: a flickering jagged bolt and a double flash that fades.
    if s == Sky::Thunderstorm {
        let slot = (t / 5.0).floor() as u32;
        let local = t - slot as f32 * 5.0 - rnd(slot, 91) * 3.0;
        if (0.0..1.0).contains(&local) {
            let second = if local > 0.18 { 0.7 * (-(local - 0.18) * 9.0).exp() } else { 0.0 };
            let flash = (-local * 7.0).exp() + second;
            p.rect_filled(r, 0.0, Color32::from_white_alpha((flash * 110.0).min(255.0) as u8));
            if local < 0.35 && (local * 30.0) as i32 % 3 != 1 {
                let a = (1.0 - local / 0.35) * 255.0;
                let bolt = |x0: f32, y0: f32, y1: f32, seed: u32, spread: f32, w: f32| {
                    let (mut x, mut y, mut k, mut pts) = (x0, y0, 0, vec![]);
                    while y < y1 {
                        pts.push(pos2(x, y));
                        y += 14.0 + 22.0 * rnd(seed * 131 + k, 93);
                        x += (rnd(seed * 131 + k, 95) - 0.5) * spread;
                        k += 1;
                    }
                    p.add(Shape::line(pts.clone(), Stroke::new(w * 4.0, rgba(170, 180, 255, (a * 0.25) as u8))));
                    p.add(Shape::line(pts.clone(), Stroke::new(w, Color32::from_white_alpha(a as u8))));
                    pts
                };
                let main = bolt(at(0.15 + 0.7 * rnd(slot, 97), 0.0).x, r.top(), r.top() + height * (0.5 + 0.3 * rnd(slot, 99)), slot, 40.0, 2.2);
                if let Some(fork) = main.get(main.len() / 3) {
                    bolt(fork.x, fork.y, fork.y + height * 0.2, slot + 7, 70.0, 1.2);
                }
            }
        }
    }
}

/// Soft radial blob: solid-ish center fading to a transparent edge (egui has no blur, so this fakes one).
fn glow(p: &Painter, c: egui::Pos2, radius: egui::Vec2, color: Color32) {
    const N: u32 = 24;
    let mut m = egui::Mesh::default();
    m.colored_vertex(c, color);
    for (scale, col) in [(0.55, color.gamma_multiply(0.55)), (1.0, Color32::TRANSPARENT)] {
        for i in 0..N {
            let a = TAU * i as f32 / N as f32;
            m.colored_vertex(c + vec2(a.cos() * radius.x, a.sin() * radius.y) * scale, col);
        }
    }
    for i in 0..N {
        let (m0, m1, o0, o1) = (1 + i, 1 + (i + 1) % N, 1 + N + i, 1 + N + (i + 1) % N);
        m.add_triangle(0, m0, m1);
        m.add_triangle(m0, o0, o1);
        m.add_triangle(m0, o1, m1);
    }
    p.add(m);
}

/// Cheap deterministic "random" in 0..1, so particles keep their place between frames.
fn rnd(i: u32, salt: u32) -> f32 {
    let mut h = i.wrapping_mul(0x9E37_79B1) ^ salt.wrapping_mul(0x85EB_CA6B);
    h ^= h >> 15;
    h = h.wrapping_mul(0x2C1B_3C6D);
    h ^= h >> 12;
    (h % 10_000) as f32 / 10_000.0
}

/// Wraps a coordinate into -pad..len+pad so things leave one edge and re-enter at the other.
fn wrap(v: f32, len: f32, pad: f32) -> f32 {
    v.rem_euclid(len + 2.0 * pad) - pad
}
