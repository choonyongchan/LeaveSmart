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
exports.UserDB = void 0;
const redis_1 = require("redis");
class UserDB {
    constructor() {
        this.db = (0, redis_1.createClient)().on('error', (err) => { console.error('Redis error: ', err); }).connect();
    }
    health() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = yield this.db;
                yield db.set('health', 'ok');
                const reply = yield db.get('health');
                return reply === 'ok';
            }
            catch (error) {
                console.error('Redis Health Check Failed:', error);
                return false;
            }
        });
    }
    set(value) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = yield this.db;
            yield db.SADD(UserDB.KEY, value);
        });
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            const db = yield this.db;
            return yield db.SMEMBERS(UserDB.KEY);
        });
    }
}
exports.UserDB = UserDB;
UserDB.KEY = 'msgId';
// const db: UserDB = new UserDB();
// db.set('Hello');
// db.get().then((values) => console.log(values));
