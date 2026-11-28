export interface ForecastCoordinates {
    latitude: number;
    longitude: number;
}

export interface ForecastLocation {
    id: number;
    coordinates: ForecastCoordinates;
}

// Retain every provider field, including optional precipitation, gusts and future additions.
export interface OpenWeatherForecast {
    cod: string;
    cnt: number;
    list: {
        dt: number;
        dt_txt: string;
        main: { temp: number; [key: string]: unknown };
        [key: string]: unknown;
    }[];
    city: { timezone: number; [key: string]: unknown };
    [key: string]: unknown;
}

export interface CachedWeatherForecast {
    objectLocationId: number;
    fetchedAt: string;
    data: OpenWeatherForecast;
}

export interface WeatherForecastResponse extends CachedWeatherForecast {
    stale: boolean;
}
