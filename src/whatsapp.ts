import qrcode from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';

import { UserDB } from './backend/userdb';
import { WeatherAPI, WeatherData } from './backend/weather';

export class Whatsapp {

    private static readonly INTERVALMINS: number = 10;
    private static forecastFlag: boolean = false;
    private static rainFlag: boolean = false;
    private static db: UserDB = new UserDB();
    private client: Client; 


    private static onQr(qr: string): void {
        qrcode.generate(qr, {small: true});
    }

    private static onAuthenticated(session: any): void {
        console.log('Client is authenticated');
    }

    private static onReady(): void {
        console.log('Client is ready');
    }

    private static onDisconnected(): void {
        console.log('Client is disconnected');
    }

    private static onAuthFailure(): void {
        console.log('Client failed authentication');
    }

    private static async isRegistered(message: any): Promise<boolean> {
        return await Whatsapp.db.has(message.from);
    }

    private static async reply(message: any, text: string): Promise<void> {
        await message.reply(`[LeaveSmart] ${text}`);
    }

    private static async onSubscribe(message: any): Promise<void> {
        if (await Whatsapp.isRegistered(message)) {
            await Whatsapp.reply(message, 'Previously registered!');
        } else {
            await Whatsapp.db.add(message.from);
            await Whatsapp.reply(message, 'You are registered! Welcome!');
        }
        await Whatsapp.onNow(message);
    }

    private static async onUnsubscribe(message: any): Promise<void> {
        // Check if user is already registered
        // If yes, remove user from database and reply "You have been unregistered"
        // If no, reply "Not registered"
        if (!await Whatsapp.isRegistered(message)) {
            await Whatsapp.reply(message, 'Not registered!');
        } else {
            await Whatsapp.db.remove(message.from);
            await Whatsapp.reply(message, 'You have been unregistered');
        }
    } 

    private static async onNow(message: any): Promise<void> {
        // Get the current weather forecast
        const forecast = await WeatherAPI.getForecast();
        await Whatsapp.reply(message, `The forecast for Pasir Ris is ${forecast.twohr_forecast}. It is currently ${forecast.rain_status_now ? 'raining' : 'not raining'}`);
    }

    private static async onMessageCreate(message: any) {
        switch (message.body) {
            case '/sub':
                await Whatsapp.onSubscribe(message);
                break;
            case '/unsub':
                await Whatsapp.onUnsubscribe(message);
                break;
            case '/now':
                await Whatsapp.onNow(message);
                break;
        }
    }

    private static alertCondition(forecast: string): boolean {
        return forecast.includes('Showers') || forecast.includes('Rain');
    }

    private static async sleep(): Promise<void> {
        const ms: number = Whatsapp.INTERVALMINS * 60 * 1000;
        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    private static async watch(): Promise<void> {
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
            const now: Date = new Date();
            const nowString: string = now.toLocaleTimeString("en-SG", {timeZone: 'Asia/Singapore', hour: '2-digit', minute:'2-digit'});
            console.log(`Update: ${nowString}`);

            const forecast: WeatherData = await WeatherAPI.getForecast();
            // Part 1: Two Hr Forecast
            const isForecastAlert: boolean = Whatsapp.alertCondition(forecast.twohr_forecast);
            if (isForecastAlert && !Whatsapp.forecastFlag) {
                const msgId: string[] = await Whatsapp.db.get();
                await Promise.all(msgId.map(Whatsapp.onNow));
            }
            Whatsapp.forecastFlag = isForecastAlert; // Update rainFlag

            // Part 2: Current Raining
            if (forecast.rain_status_now && !Whatsapp.rainFlag) {
                const msgId: string[] = await Whatsapp.db.get();
                await Promise.all(msgId.map((id: string) => Whatsapp.reply(id, `It has started raining in Pasir Ris!`)));
            }
            Whatsapp.rainFlag = forecast.rain_status_now; // Update rainFlag

            await this.sleep(); // Default: 10 mins because NEA Api updates every 10 mins
        }
    }

    constructor() {
        this.client = (
            new Client({authStrategy: new LocalAuth(),})
            .on('qr', Whatsapp.onQr)
            .on('authenticated', Whatsapp.onAuthenticated)
            .on('ready', Whatsapp.onReady)
            .on('disconnected', Whatsapp.onDisconnected)
            .on('auth_failure', Whatsapp.onAuthFailure)
            .on('message_create', Whatsapp.onMessageCreate)
        );
    }

    public async initialize(): Promise<void> {
        await this.client.initialize();
        await Whatsapp.watch();
    }
}

const whatsapp: Whatsapp = new Whatsapp();
 whatsapp.initialize();