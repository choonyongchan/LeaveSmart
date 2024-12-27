"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherAPI = void 0;
/**
 * WeatherAPI retrieves SG Weather Info from the Data.gov API.
 */
class WeatherAPI {
    TWOHRFORECASTAPI = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast';
    REALTIMEPRECIPITATIONAPI = 'https://api-open.data.gov.sg/v2/real-time/api/rainfall';
    PRECIPITATION_THRESHOLD = 0;
    /**
     * Fetches data from the API.
     *
     * @param api The API to fetch data from.
     *
     * @returns The JSON object fetched.
     */
    async getData(api) {
        const response = await fetch(api);
        if (!response.ok)
            throw new Error('Failed to fetch data');
        return response.json();
    }
    /**
     * Parses the JSON object to extract the 2-hour forecast data.
     *
     * @param data The JSON object to parse.
     *
     * @returns The 2-hour forecast data.
     */
    parseTwoHrForecastData(data) {
        const forecastItem = data.data.items[0];
        const updateTimestamp = new Date(forecastItem.update_timestamp);
        const validPeriod = forecastItem.valid_period.text;
        const forecast = forecastItem.forecasts.find((forecast) => forecast.area === 'Pasir Ris').forecast;
        return {
            update_timestamp: updateTimestamp,
            valid_period: validPeriod,
            forecast: forecast,
        };
    }
    /**
     * Parses the JSON object to extract the real-time precipitation data.
     *
     * @param data The JSON object to parse.
     *
     * @returns The real-time precipitation data.
     */
    parseRealTimePrecipitationData(data) {
        // At time of writing, 2 weather stations are located in Pasir Ris. S94: Street 51. S29: Drive 12.    
        const timestamp = new Date(data.data.readings[0].timestamp);
        const id = data.data.stations.find((station) => station.name.startsWith('Pasir Ris Street 51')).id;
        const precipitate = data.data.readings[0].data.find((reading) => reading.stationId === id).value;
        return {
            timestamp: timestamp,
            precipitation: precipitate,
        };
    }
    /**
     * Retrieves the weather forecast.
     *
     * @returns Weather Data.
     */
    async getForecast() {
        const twoHrForecastJSON = await this.getData(this.TWOHRFORECASTAPI);
        const twoHrForecastData = this.parseTwoHrForecastData(twoHrForecastJSON);
        const realTimePrecipitationJSON = await this.getData(this.REALTIMEPRECIPITATIONAPI);
        const realTimePrecipitationData = this.parseRealTimePrecipitationData(realTimePrecipitationJSON);
        const earliestTimestamp = // Records the most outdated timestamp
         twoHrForecastData.update_timestamp < realTimePrecipitationData.timestamp
            ? twoHrForecastData.update_timestamp
            : realTimePrecipitationData.timestamp;
        const rainStatusNow = realTimePrecipitationData.precipitation > this.PRECIPITATION_THRESHOLD;
        return {
            timestamp: earliestTimestamp,
            twohr_forecast: twoHrForecastData.forecast,
            rain_status_now: rainStatusNow,
        };
    }
}
exports.WeatherAPI = WeatherAPI;
// const weatherAPI = new WeatherAPI();
// weatherAPI.getForecast().then((forecast: WeatherData) => {
//   console.log(`The forecast for Pasir Ris is ${forecast.twohr_forecast}. It is currently ${forecast.rain_status_now ? 'raining' : 'not raining'}`);
// });
