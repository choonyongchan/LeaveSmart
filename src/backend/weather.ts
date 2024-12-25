type TwoHrForecastData = {
    update_timestamp: Date;
    valid_period: string;
    forecast: string;
}

type RealTimePrecipitationData = {
    timestamp: Date;
    precipitation: number;
}

export type WeatherData = {
    timestamp: Date;
    twohr_forecast: string;
    rain_status_now: boolean;
}

/**
 * WeatherAPI retrieves SG Weather Info from the Data.gov API.
 */
export class WeatherAPI {

    private static TWOHRFORECASTAPI: string = "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast";
    private static REALTIMEPRECIPITATIONAPI: string = "https://api-open.data.gov.sg/v2/real-time/api/rainfall";
    private static PRECIPITATION_THRESHOLD: number = 0;

    /**
     * Fetches data from the API.
     * 
     * @param api The API to fetch data from.
     * 
     * @returns The JSON object fetched.
     */
    private static async getData(api: string): Promise<any> {
        const response: Response = await fetch(api);
        if (!response.ok) throw new Error('Failed to fetch data');
        return await response.json();
    }

    /**
     * Parses the JSON object to extract the 2-hour forecast data.
     * 
     * @param data The JSON object to parse.
     * 
     * @returns The 2-hour forecast data.
     */
    private static parseTwoHrForecastData(data: any): TwoHrForecastData {
        const forecastItem: any = data.data.items[0];
        const updateTimestamp: Date = new Date(forecastItem.update_timestamp);
        const validPeriod: string = forecastItem.valid_period.text;
        const forecast: string = forecastItem.forecasts.find((forecast: any) => forecast.area === "Pasir Ris").forecast;
        return {
            "update_timestamp": updateTimestamp,
            "valid_period": validPeriod,
            "forecast": forecast
        };
    }

    /**
     * Parses the JSON object to extract the real-time precipitation data.
     * 
     * @param data The JSON object to parse.
     * 
     * @returns The real-time precipitation data.
     */
    private static parseRealTimePrecipitationData(data: any): RealTimePrecipitationData {
        // At time of writing, 2 weather stations are located in Pasir Ris. S94: Street 51. S29: Drive 12.
        const timestamp: Date = new Date(data.data.readings[0].timestamp);
        const id: string = data.data.stations.find((station: any) => station.name.startsWith("Pasir Ris Street 51")).id;
        const precipitate: number = data.data.readings[0].data.find((reading: any) => reading.stationId === id).value;
        return {
            "timestamp": timestamp,
            "precipitation": precipitate
        };
    }

    /**
     * Retrieves the weather forecast.
     * 
     * @returns Weather Data.
     */
    public static async getForecast(): Promise<WeatherData> {
        const apis: string[] = [this.TWOHRFORECASTAPI, this.REALTIMEPRECIPITATIONAPI];
        const [twoHrForecastJSON, realTimePrecipitationJSON] = await Promise.all(apis.map((api: string) => this.getData(api)));
        const twoHrForecastData: TwoHrForecastData = this.parseTwoHrForecastData(twoHrForecastJSON);
        const realTimePrecipitationData: RealTimePrecipitationData = this.parseRealTimePrecipitationData(realTimePrecipitationJSON);


        const earliestTimestamp: Date = ( // Records the most outdated timestamp
            twoHrForecastData.update_timestamp < realTimePrecipitationData.timestamp 
            ? twoHrForecastData.update_timestamp 
            : realTimePrecipitationData.timestamp
        );

        return {
            "timestamp": earliestTimestamp,
            "twohr_forecast": twoHrForecastData.forecast,
            "rain_status_now": (realTimePrecipitationData.precipitation > WeatherAPI.PRECIPITATION_THRESHOLD)
        };
    }
}

// WeatherAPI.getForecast().then((forecast: WeatherData) => {
//     console.log(`The forecast for Pasir Ris is ${forecast.twohr_forecast}. It is currently ${forecast.rain_status_now ? 'raining' : 'not raining'}`);
// });

