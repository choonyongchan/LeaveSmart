"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherAPI = void 0;
/**
 * WeatherAPI retrieves SG Weather Info from the Data.gov API.
 */
class WeatherAPI {
    /**
     * Fetches data from the API.
     *
     * @param api The API to fetch data from.
     *
     * @returns The JSON object fetched.
     */
    static getData(api) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(api);
            if (!response.ok)
                throw new Error('Failed to fetch data');
            return yield response.json();
        });
    }
    /**
     * Parses the JSON object to extract the 2-hour forecast data.
     *
     * @param data The JSON object to parse.
     *
     * @returns The 2-hour forecast data.
     */
    static parseTwoHrForecastData(data) {
        const forecastItem = data.data.items[0];
        const updateTimestamp = new Date(forecastItem.update_timestamp);
        const validPeriod = forecastItem.valid_period.text;
        const forecast = forecastItem.forecasts.find((forecast) => forecast.area === "Pasir Ris").forecast;
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
    static parseRealTimePrecipitationData(data) {
        // At time of writing, 2 weather stations are located in Pasir Ris. S94: Street 51. S29: Drive 12.
        const timestamp = new Date(data.data.readings[0].timestamp);
        const id = data.data.stations.find((station) => station.name.startsWith("Pasir Ris Street 51")).id;
        const precipitate = data.data.readings[0].data.find((reading) => reading.stationId === id).value;
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
    static getForecast() {
        return __awaiter(this, void 0, void 0, function* () {
            const apis = [this.TWOHRFORECASTAPI, this.REALTIMEPRECIPITATIONAPI];
            const [twoHrForecastJSON, realTimePrecipitationJSON] = yield Promise.all(apis.map((api) => this.getData(api)));
            const twoHrForecastData = this.parseTwoHrForecastData(twoHrForecastJSON);
            const realTimePrecipitationData = this.parseRealTimePrecipitationData(realTimePrecipitationJSON);
            const earliestTimestamp = ( // Records the most outdated timestamp
            twoHrForecastData.update_timestamp < realTimePrecipitationData.timestamp
                ? twoHrForecastData.update_timestamp
                : realTimePrecipitationData.timestamp);
            return {
                "timestamp": earliestTimestamp,
                "twohr_forecast": twoHrForecastData.forecast,
                "rain_status_now": (realTimePrecipitationData.precipitation > WeatherAPI.PRECIPITATION_THRESHOLD)
            };
        });
    }
}
exports.WeatherAPI = WeatherAPI;
WeatherAPI.TWOHRFORECASTAPI = "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast";
WeatherAPI.REALTIMEPRECIPITATIONAPI = "https://api-open.data.gov.sg/v2/real-time/api/rainfall";
WeatherAPI.PRECIPITATION_THRESHOLD = 0;
// WeatherAPI.getForecast().then((forecast: WeatherData) => {
//     console.log(`The forecast for Pasir Ris is ${forecast.twohr_forecast}. It is currently ${forecast.rain_status_now ? 'raining' : 'not raining'}`);
// });
