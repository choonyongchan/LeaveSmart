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
/**
 * The main class for the LeaveSmart WhatsApp bot.
 */
class Whatsapp {
    WATCHINTERVAL = 30; // Empirically, updates occur every :00, :05, :30, :35 of the hour
    LOCALEARG = "en-sg";
    DTFMTOPTS = {
        timeZone: 'Asia/Singapore',
        hour: '2-digit',
        minute: '2-digit',
    };
    prevForecast = false;
    prevRaining = false;
    client;
    db;
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
    /**
     * Initializes the WhatsApp bot. Must be called before any other methods.
     */
    async initialize() {
        await this.client.initialize();
    }
    /**
     * Checks if a user is registered in the User DB.
     *
     * @param msgId The message ID to check.
     *
     * @returns True if the user is registered, false otherwise.
     */
    isUserRegistered(msgId) {
        return this.db.has(msgId);
    }
    /**
     * Checks if the weather forecast contains a rain alert.
     *
     * @param forecast The weather forecast to check.
     *
     * @returns True if the forecast contains a rain alert, false otherwise.
     */
    isRainAlert(forecast) {
        const twoHrForecast = forecast.twohr_forecast;
        return twoHrForecast.includes('Showers') || twoHrForecast.includes('Rain');
    }
    // STANDARD CALLBACKS FOR WHATSAPP-WEB.JS
    /**
     * Displays the QR code for authentication.
     *
     * @param qr The QR code to display.
     */
    onQr(qr) {
        qrcode_terminal_1.default.generate(qr, { small: true });
    }
    /**
     * Callback for when the client is authenticated.
     *
     * @param session The session object.
     */
    onAuthenticated(session) {
        console.log('Client is authenticated');
    }
    /**
     * Callback for when the client is ready.
     */
    onReady() {
        console.log('Client is ready');
    }
    /**
     * Callback for when the client is disconnected.
     */
    onDisconnected() {
        console.log('Client is disconnected');
    }
    /**
     * Callback for when the client fails authentication.
     */
    onAuthFailure() {
        console.log('Client failed authentication');
    }
    // END OF STANDARD CALLBACKS
    /**
     * Sends a message to a user.
     *
     * @param msgId The message ID to send to.
     * @param text The text to send.
     */
    async send(msgId, text) {
        await this.client.sendMessage(msgId, `[LeaveSmart] ${text}`);
    }
    /**
     * Callback for when a user subscribes to the bot.
     * Includes an automatic call to onNow.
     *
     * @param message The message object.
     */
    async onSubscribe(message) {
        const msgId = message.from;
        if (await this.isUserRegistered(msgId)) {
            await this.send(msgId, 'ℹ️\n Previously registered!');
        }
        else {
            await this.db.add(msgId);
            await this.send(msgId, '✅\n You are registered! Welcome!');
        }
        await this.onNow(message);
    }
    /**
     * Callback for when a user unsubscribes from the bot.
     *
     * @param message The message object.
     */
    async onUnsubscribe(message) {
        // Check if user is already registered
        // If yes, remove user from database and reply "You have been unregistered"
        // If no, reply "Not registered"
        const msgId = message.from;
        if (await this.isUserRegistered(msgId)) {
            await this.db.remove(msgId);
            await this.send(msgId, '✅\n You have been unregistered');
        }
        else {
            await this.send(msgId, 'ℹ️\n Not registered!');
        }
    }
    async sendForecast(msgId, forecast) {
        const isAlertCondition = this.isRainAlert(forecast);
        const twoHrForecast = forecast.twohr_forecast;
        const msg = (isAlertCondition ?
            `🌧️\n Rain Forecast! 2-Hour Forecast: ${twoHrForecast}` :
            `ℹ️\n Clear Sky! 2-Hour Forecast: ${twoHrForecast}`);
        await this.send(msgId, msg);
    }
    async sendRainStatus(msgId, forecast) {
        const rainStatus = forecast.rain_status_now;
        const msg = (rainStatus ?
            `🌧️\n Rain Alert! It is currently raining in Pasir Ris!` :
            `ℹ️\n Clear Sky! It is not currently raining in Pasir Ris!`);
        await this.send(msgId, msg);
    }
    /**
     * Callback for when a user requests the current weather forecast.
     *
     * @param message The message object.
     */
    async onNow(message) {
        // Get the current weather forecast
        const forecast = await this.weatherApi.getForecast();
        const msgId = message.from;
        await this.sendForecast(msgId, forecast);
        await this.sendRainStatus(msgId, forecast);
    }
    /**
     * Sleeps for a specified number of minutes.
     */
    async sleep(mins) {
        const ms = mins * 60 * 1000;
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Callback for when the bot is watching the weather forecast.
     */
    async onWatch(message) {
        // 5 Cases: Forecast Rain, Forecast No Rain, Raining, Not Raining, No Change  
        const msgId = message.from;
        this.send(msgId, '👀\n Watching the weather forecast...');
        //const ADMINS: string[] = [message.from];
        while (true) {
            const forecast = await this.weatherApi.getForecast();
            const msgIds = await this.db.get();
            console.log(`Update: ${forecast.timestamp.toLocaleTimeString(this.LOCALEARG, this.DTFMTOPTS)}`);
            // Part 1: Two Hr Forecast Trigger
            const isRainAlert = this.isRainAlert(forecast);
            if (this.prevForecast !== isRainAlert)
                await Promise.all(msgIds.map(id => this.sendForecast(id, forecast))); // Trigger and Stand Down
            this.prevForecast = isRainAlert; // Update rainFlag
            // Part 2: Current Raining
            const isRaining = forecast.rain_status_now;
            if (this.prevRaining !== isRaining)
                await Promise.all(msgIds.map(id => this.sendRainStatus(id, forecast))); // Trigger
            this.prevRaining = isRaining; // Update rainFlag
            await this.sleep(this.WATCHINTERVAL); // Default: 10 mins because NEA Api updates every 10 mins
        }
    }
    /**
     * Callback for when a message is created.
     *
     * @param message The message object.
     */
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
                await this.onWatch(message);
                break;
        }
    }
}
exports.Whatsapp = Whatsapp;
