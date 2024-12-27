"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDB = void 0;
const redis_1 = require("redis");
class UserDB {
    KEY = 'msgId';
    db;
    constructor() {
        this.db = (0, redis_1.createClient)()
            .on('error', (err) => console.error('Redis error: ', err))
            .connect();
    }
    async health() {
        try {
            const db = await this.db;
            await db.set('health', 'ok');
            const reply = await db.get('health');
            return reply === 'ok';
        }
        catch (error) {
            console.error('Redis Health Check Failed:', error);
            return false;
        }
    }
    async add(msgId) {
        const db = await this.db;
        await db.SADD(this.KEY, msgId);
    }
    async remove(msgId) {
        const db = await this.db;
        await db.SREM(this.KEY, msgId);
    }
    async get() {
        const db = await this.db;
        return db.SMEMBERS(this.KEY);
    }
    async has(msgId) {
        const db = await this.db;
        return db.SISMEMBER(this.KEY, msgId);
    }
}
exports.UserDB = UserDB;
// const db: UserDB = new UserDB();
// db.add('Hello');
// db.has('Hello').then((value) => console.log(value));
// db.get().then((values) => console.log(values));
// db.remove('Hello');
// db.has('Hello').then((value) => console.log(value));
