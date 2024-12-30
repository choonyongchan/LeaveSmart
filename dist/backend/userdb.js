"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDB = void 0;
const redis_1 = require("redis");
/**
 * Database to store user data.
 */
class UserDB {
    KEY = 'msgId';
    db;
    constructor() {
        this.db = (0, redis_1.createClient)();
        this.db.on('error', (err) => console.error('Redis error: ', err));
        this.db.connect();
    }
    /**
     * Checks if the database is healthy.
     *
     * @returns True if the database is healthy, false otherwise.
     */
    async health() {
        try {
            await this.db.set('health', 'ok');
            const reply = await this.db.get('health');
            return reply === 'ok';
        }
        catch (error) {
            console.error('Redis Health Check Failed:', error);
            return false;
        }
    }
    /**
     * Adds a message ID to the database.
     *
     * @param msgId The message ID to add.
     */
    async add(msgId) {
        await this.db.SADD(this.KEY, msgId);
    }
    /**
     * Removes a message ID from the database.
     *
     * @param msgId The message ID to remove.
     */
    async remove(msgId) {
        await this.db.SREM(this.KEY, msgId);
    }
    /**
     * Retrieves all message IDs from the database.
     *
     * @return All message IDs in the database.
     */
    async get() {
        return this.db.SMEMBERS(this.KEY);
    }
    /**
     * Checks if a message ID is in the database.
     *
     * @param msgId The message ID to check.
     *
     * @returns True if the message ID is in the database, false otherwise.
     */
    async has(msgId) {
        return this.db.SISMEMBER(this.KEY, msgId);
    }
}
exports.UserDB = UserDB;
// const db: UserDB = new UserDB();
// db.add('Hello');
// db.has('Hello').then((value) => console.log(value));
// db.get().then((values) => console.log(values));
// db.remove('Hello');
// db.has('Hello').then((value) => console.log(value));
