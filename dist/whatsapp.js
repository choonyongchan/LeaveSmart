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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Whatsapp = void 0;
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const whatsapp_web_js_1 = require("whatsapp-web.js");
const userdb_1 = require("./backend/userdb");
const weather_1 = require("./backend/weather");
class Whatsapp {
    static onQr(qr) {
        qrcode_terminal_1.default.generate(qr, { small: true });
    }
    static onAuthenticated(session) {
        console.log('Client is authenticated');
    }
    static onReady() {
        console.log('Client is ready');
    }
    static onDisconnected() {
        console.log('Client is disconnected');
    }
    static onAuthFailure() {
        console.log('Client failed authentication');
    }
    static isRegistered(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Whatsapp.db.has(message.from);
        });
    }
    static reply(message, text) {
        return __awaiter(this, void 0, void 0, function* () {
            yield message.reply(`[LeaveSmart] ${text}`);
        });
    }
    static onSubscribe(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield Whatsapp.isRegistered(message)) {
                yield Whatsapp.reply(message, 'Previously registered!');
            }
            else {
                yield Whatsapp.db.add(message.from);
                yield Whatsapp.reply(message, 'You are registered! Welcome!');
            }
            yield Whatsapp.onNow(message);
        });
    }
    static onUnsubscribe(message) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if user is already registered
            // If yes, remove user from database and reply "You have been unregistered"
            // If no, reply "Not registered"
            if (!(yield Whatsapp.isRegistered(message))) {
                yield Whatsapp.reply(message, 'Not registered!');
            }
            else {
                yield Whatsapp.db.remove(message.from);
                yield Whatsapp.reply(message, 'You have been unregistered');
            }
        });
    }
    static onNow(message) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the current weather forecast
            const forecast = yield weather_1.WeatherAPI.getForecast();
            yield Whatsapp.reply(message, `The forecast for Pasir Ris is ${forecast.twohr_forecast}. It is currently ${forecast.rain_status_now ? 'raining' : 'not raining'}`);
        });
    }
    static onMessageCreate(message) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (message.body) {
                case '/sub':
                    yield Whatsapp.onSubscribe(message);
                    break;
                case '/unsub':
                    yield Whatsapp.onUnsubscribe(message);
                    break;
                case '/now':
                    yield Whatsapp.onNow(message);
                    break;
            }
        });
    }
    static alertCondition(forecast) {
        return forecast.includes('Showers') || forecast.includes('Rain');
    }
    static sleep() {
        return __awaiter(this, void 0, void 0, function* () {
            const ms = Whatsapp.INTERVALMINS * 60 * 1000;
            yield new Promise((resolve) => setTimeout(resolve, ms));
        });
    }
    static watch() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Pub-Sub model in future?
            // Get weather forecast
            // If not raining/showers, reset timestamp and sleep
            // If raining, check if timestamp is outdated
            // If yes, send updates to all clients and reset timestamp and sleep
            // If no, sleep
            // Get all clients
            // Filter clients with outdated timestamp
            // Send weather forecast to all clients
            while (true) {
                const now = new Date();
                const nowString = now.toLocaleTimeString("en-SG", { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' });
                console.log(`Update: ${nowString}`);
                const forecast = yield weather_1.WeatherAPI.getForecast();
                // Part 1: Two Hr Forecast
                const isForecastAlert = Whatsapp.alertCondition(forecast.twohr_forecast);
                if (isForecastAlert && !Whatsapp.forecastFlag) {
                    const msgId = yield Whatsapp.db.get();
                    yield Promise.all(msgId.map(Whatsapp.onNow));
                }
                Whatsapp.forecastFlag = isForecastAlert; // Update rainFlag
                // Part 2: Current Raining
                if (forecast.rain_status_now && !Whatsapp.rainFlag) {
                    const msgId = yield Whatsapp.db.get();
                    yield Promise.all(msgId.map((id) => Whatsapp.reply(id, `It has started raining in Pasir Ris!`)));
                }
                Whatsapp.rainFlag = forecast.rain_status_now; // Update rainFlag
                yield this.sleep(); // Default: 10 mins because NEA Api updates every 10 mins
            }
        });
    }
    constructor() {
        this.client = (new whatsapp_web_js_1.Client({ authStrategy: new whatsapp_web_js_1.LocalAuth(), })
            .on('qr', Whatsapp.onQr)
            .on('authenticated', Whatsapp.onAuthenticated)
            .on('ready', Whatsapp.onReady)
            .on('disconnected', Whatsapp.onDisconnected)
            .on('auth_failure', Whatsapp.onAuthFailure)
            .on('message_create', Whatsapp.onMessageCreate));
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.initialize();
            yield Whatsapp.watch();
        });
    }
}
exports.Whatsapp = Whatsapp;
Whatsapp.INTERVALMINS = 10;
Whatsapp.forecastFlag = false;
Whatsapp.rainFlag = false;
Whatsapp.db = new userdb_1.UserDB();
const whatsapp = new Whatsapp();
whatsapp.initialize();
