import qrcode from 'qrcode-terminal';
import {Client, LocalAuth} from 'whatsapp-web.js';

import {UserDB} from './backend/userdb';
import {WeatherAPI, WeatherData} from './backend/weather';

/**
 * The main class for the LeaveSmart WhatsApp bot.
 */
export class Whatsapp {
  private readonly WATCHINTERVAL: number = 30; // Empirically, updates occur every :00, :05, :30, :35 of the hour
  private readonly LOCALEARG: Intl.LocalesArgument = "en-sg";
  private readonly DTFMTOPTS: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
  };
  private prevForecast: boolean = false;
  private prevRaining: boolean = false;
  private client: Client;
  private db: UserDB;
  private weatherApi: WeatherAPI;

  constructor() {
    this.client = (
      new Client({authStrategy: new LocalAuth()})
      .on('qr', this.onQr)
      .on('authenticated', this.onAuthenticated)
      .on('ready', this.onReady)
      .on('disconnected', this.onDisconnected)
      .on('auth_failure', this.onAuthFailure)
      .on('message_create', (message: any) => this.onMessageCreate(message)) // To preserve execution context
    );
    this.db = new UserDB();
    this.weatherApi = new WeatherAPI();
  }

  /**
   * Initializes the WhatsApp bot. Must be called before any other methods.
   */
  public async initialize(): Promise<void> {
    await this.client.initialize();
  }

  /**
   * Checks if a user is registered in the User DB.
   * 
   * @param msgId The message ID to check.
   * 
   * @returns True if the user is registered, false otherwise.
   */
  private isUserRegistered(msgId: string): Promise<boolean> {
    return this.db.has(msgId);
  }

  /**
   * Checks if the forecast contains rain.
   * 
   * @param forecast The forecast to check.
   * 
   * @returns True if the forecast contains rain, false otherwise.
   */
  private isRainAlert(forecast: string): boolean {
    return forecast.includes('Showers') || forecast.includes('Rain');
  }

  // STANDARD CALLBACKS FOR WHATSAPP-WEB.JS
  /**
   * Displays the QR code for authentication.
   * 
   * @param qr The QR code to display.
   */
  private onQr(qr: string): void {
    qrcode.generate(qr, {small: true});
  }

  /**
   * Callback for when the client is authenticated.
   * 
   * @param session The session object.
   */
  private onAuthenticated(session: any): void {
    console.log('Client is authenticated');
  }

  /**
   * Callback for when the client is ready.
   */
  private onReady(): void {
    console.log('Client is ready');
  }

  /**
   * Callback for when the client is disconnected.
   */
  private onDisconnected(): void {
    console.log('Client is disconnected');
  }

  /**
   * Callback for when the client fails authentication.
   */
  private onAuthFailure(): void {
    console.log('Client failed authentication');
  }
  // END OF STANDARD CALLBACKS

  /**
   * Sends a message to a user.
   * 
   * @param msgId The message ID to send to.
   * @param text The text to send.
   */
  private async send(msgId: any, text: string): Promise<void> {
    await this.client.sendMessage(msgId, `[LeaveSmart] ${text}`);
  }

  /**
   * Callback for when a user subscribes to the bot.
   * Includes an automatic call to onNow.
   * 
   * @param message The message object.
   */
  private async onSubscribe(message: any): Promise<void> {
    const msgId: string = message.from;
    if (await this.isUserRegistered(msgId)) {
      await this.send(msgId, 'Previously registered!');
    } else {
      await this.db.add(msgId);
      await this.send(msgId, 'You are registered! Welcome!');
    }
    await this.onNow(message);
  }

  /**
   * Callback for when a user unsubscribes from the bot.
   * 
   * @param message The message object.
   */
  private async onUnsubscribe(message: any): Promise<void> {
    // Check if user is already registered
    // If yes, remove user from database and reply "You have been unregistered"
    // If no, reply "Not registered"
    const msgId: string = message.from;
    if (await this.isUserRegistered(msgId)) {
      await this.db.remove(msgId);
      await this.send(msgId, 'You have been unregistered');
    } else {
      await this.send(msgId, 'Not registered!');
    }
  }

  /**
   * Callback for when a user requests the current weather forecast.
   * 
   * @param message The message object.
   */
  private async onNow(message: any): Promise<void> {
    // Get the current weather forecast
    const msgId: string = message.from;
    const forecast = await this.weatherApi.getForecast();
    await this.send(
      msgId,
      `The forecast for Pasir Ris is ${forecast.twohr_forecast}. It is currently ${forecast.rain_status_now ? 'raining' : 'not raining'}`,
    );
  }

  /**
   * Sleeps for a specified number of minutes.
   */
  private async sleep(mins: number): Promise<void> {
    const ms: number = mins * 60 * 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Callback for when the bot is watching the weather forecast.
   */
  private async onWatch(): Promise<void> {
    // TODO: Pub-Sub model in future?  
    while (true) { 
      const forecast: WeatherData = await this.weatherApi.getForecast();
      const msgIds: string[] = await this.db.get();
      console.log(`Update: ${forecast.timestamp.toLocaleTimeString(this.LOCALEARG, this.DTFMTOPTS)}`);
      
      // Part 1: Two Hr Forecast
      const isRainAlert: boolean = this.isRainAlert(forecast.twohr_forecast);
      if (!this.prevForecast && isRainAlert) await Promise.all(msgIds.map(id => this.send(id, 'It will rain in Pasir Ris within 2 hours!')));
      this.prevForecast = isRainAlert; // Update rainFlag

      // Part 2: Current Raining
      const isRaining: boolean = forecast.rain_status_now;
      if (!this.prevRaining && isRaining) await Promise.all(msgIds.map(id => this.send(id, 'It has started raining in Pasir Ris!')));
      this.prevRaining = isRaining; // Update rainFlag

      await this.sleep(this.WATCHINTERVAL); // Default: 10 mins because NEA Api updates every 10 mins
    }
  }

  /**
   * Callback for when a message is created.
   * 
   * @param message The message object.
   */
  private async onMessageCreate(message: any): Promise<void> {
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