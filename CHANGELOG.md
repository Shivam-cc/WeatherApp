# Changelog

## 1.0.0

First release of the Tauri version. It replaces the egui app, which stays in `legacy-egui`.

### Added
- Tauri v2 shell with three typed commands, over a UI-free `weather_core` crate shared with the legacy app.
- Svelte 5 interface: hero panel, clocks for several time zones, metrics, 48-hour timeline, 5-day chart, day-part cards, search palette (`Ctrl+K`) and settings.
- WebGL2 living sky: sun and moon from time and place, clouds, rain, snow, fog, thunderstorms with seeded lightning, post-processing and quality tiers (High, Medium, Low) with an Auto mode.
- Motion choreography, text colour that adapts to the sky, and Full, Reduced and Static motion modes.
- Request timeouts (10 s total, 5 s to connect) and typed errors with friendly messages instead of raw network text.
- Windows installer (NSIS), a new app icon, regenerated screenshots, and this documentation.
- Tests: Rust unit and live tests; Vitest; Playwright for visuals, keyboard use, axe accessibility scans and flows; and Playwright over the Chrome DevTools Protocol against the real dev and release windows.

### Fixed (found by the new tests)
- Heading label without a role, invalid definition-list markup, nested interactive palette options, and Shift+Tab leaving dialogs.
- A font inlined as a `data:` URI that the release content security policy blocked. A build check now guards against it.

### Known issues
- Windows only; macOS and Linux are untested.
- Installers are unsigned, and there is no auto-updater.
- The app can be launched twice.
