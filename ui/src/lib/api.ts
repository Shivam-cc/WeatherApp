import { invoke } from '@tauri-apps/api/core';
import type { Weather } from '../bindings/Weather';
import type { Location } from '../bindings/Location';

export const getWeather = (city: string) => invoke<Weather>('get_weather', { city });
export const getWeatherAt = (location: Location) => invoke<Weather>('get_weather_at', { location });
export const searchCity = (query: string) => invoke<Location[]>('search_city', { query });
