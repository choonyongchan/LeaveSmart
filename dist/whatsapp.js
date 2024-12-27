"use strict";
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
    ADMINS = ['6596140632@c.us'];
    WATCHINTERVAL = 10;
    LOCALEARG = "en-sg";
    DTFMTOPTS = {
        timeZone: 'Asia/Singapore',
        hour: '2-digit',
        minute: '2-digit',
    };
    prevForecast = false;
    prevRaining = false;
    db;
    client;
    weatherApi;
    constructor() {
        this.client = (new whatsapp_web_js_1.Client({ authStrategy: new whatsapp_web_js_1.LocalAuth() })
            .on('qr', this.onQr)
            .on('authenticated', this.onAuthenticated)
            .on('ready', this.onReady)
            .on('disconnected', this.onDisconnected)
            .on('auth_failure', this.onAuthFailure)
            .on('message_create', (message) => this.onMessageCreate(message)) // To preserve execution context
        );
        this.db = new userdb_1.UserDB();
        this.weatherApi = new weather_1.WeatherAPI();
    }
    async initialize() {
        await this.client.initialize();
    }
    isUserRegistered(msgId) {
        return this.db.has(msgId);
    }
    isRainAlert(forecast) {
        return forecast.includes('Showers') || forecast.includes('Rain');
    }
    onQr(qr) {
        qrcode_terminal_1.default.generate(qr, { small: true });
    }
    onAuthenticated(session) {
        console.log('Client is authenticated');
    }
    onReady() {
        console.log('Client is ready');
    }
    onDisconnected() {
        console.log('Client is disconnected');
    }
    onAuthFailure() {
        console.log('Client failed authentication');
    }
    async send(msgId, text) {
        await this.client.sendMessage(msgId, `[LeaveSmart] ${text}`);
    }
    async onSubscribe(message) {
        const msgId = message.from;
        if (await this.isUserRegistered(msgId)) {
            await this.send(msgId, 'Previously registered!');
        }
        else {
            await this.db.add(msgId);
            await this.send(msgId, 'You are registered! Welcome!');
        }
        await this.onNow(message);
    }
    async onUnsubscribe(message) {
        // Check if user is already registered
        // If yes, remove user from database and reply "You have been unregistered"
        // If no, reply "Not registered"
        const msgId = message.from;
        if (await this.isUserRegistered(msgId)) {
            await this.db.remove(msgId);
            await this.send(msgId, 'You have been unregistered');
        }
        else {
            await this.send(msgId, 'Not registered!');
        }
    }
    async onNow(message) {
        // Get the current weather forecast
        const msgId = message.from;
        const forecast = await this.weatherApi.getForecast();
        await this.send(msgId, `The forecast for Pasir Ris is ${forecast.twohr_forecast}. It is currently ${forecast.rain_status_now ? 'raining' : 'not raining'}`);
    }
    async sleep(mins) {
        const ms = mins * 60 * 1000;
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    async onWatch() {
        // TODO: Pub-Sub model in future?
        // Get weather forecast
        // If not raining/showers, reset timestamp and sleep
        // If raining, check if timestamp is outdated
        // If yes, send updates to all clients and reset timestamp and sleep
        // If no, sleep
        // Get all clients
        // Filter clients with outdated timestamp
        // Send weather forecast to all     
        while (true) {
            const forecast = await this.weatherApi.getForecast();
            const msgIds = await this.db.get();
            console.log(`Update: ${forecast.timestamp.toLocaleTimeString(this.LOCALEARG, this.DTFMTOPTS)}`);
            // Part 1: Two Hr Forecast
            const isRainAlert = this.isRainAlert(forecast.twohr_forecast);
            if (!this.prevForecast && isRainAlert)
                await Promise.all(msgIds.map(id => this.send(id, 'It will rain in Pasir Ris within 2 hours!')));
            this.prevForecast = isRainAlert; // Update rainFlag
            // Part 2: Current Raining
            const isRaining = forecast.rain_status_now;
            if (!this.prevRaining && isRaining)
                await Promise.all(msgIds.map(id => this.send(id, 'It has started raining in Pasir Ris!')));
            this.prevRaining = isRaining; // Update rainFlag
            await this.sleep(this.WATCHINTERVAL); // Default: 10 mins because NEA Api updates every 10 mins
        }
    }
    async onMessageCreate(message) {
        switch (message.body) {
            case '/sub':
                await this.onSubscribe(message);
                break;
            case '/unsub':
                await this.onUnsubscribe(message);
                break;
            case '/now':
                await this.onNow(message);
                break;
            case '/watch':
                await this.onWatch();
                break;
        }
    }
}
exports.Whatsapp = Whatsapp;
