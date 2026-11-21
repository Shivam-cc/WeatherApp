#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use weather_core::{Location, Weather};

/// Blocking `ureq` calls run on a worker thread; errors become plain strings for the UI.
async fn blocking<T: Send + 'static>(f: impl FnOnce() -> weather_core::Res<T> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || f().map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_weather(city: String) -> Result<Weather, String> {
    blocking(move || weather_core::fetch(&city)).await
}

#[tauri::command]
async fn search_city(query: String) -> Result<Vec<Location>, String> {
    blocking(move || weather_core::search(&query, 5)).await
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_weather, search_city])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
