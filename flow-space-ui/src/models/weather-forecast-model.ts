// Match the API's provider payload while retaining optional and future fields.
export interface OpenWeatherForecastModel {
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

export interface WeatherForecastModel {
    objectLocationId: number;
    fetchedAt: string;
    stale: boolean;
    data: OpenWeatherForecastModel;
}
