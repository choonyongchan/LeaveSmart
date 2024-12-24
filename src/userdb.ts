import { createClient } from 'redis';

class UserDB {

    private static KEY: string = 'msgId';
    private db: Promise<any>;

    constructor() {
        this.db = createClient().on('error', (err) => {console.error('Redis error: ', err);}).connect();
    }

    private async health(): Promise<boolean> {
        try {
            const db: any = await this.db;
            await db.set('health', 'ok');
            const reply: string = await db.get('health');
            return reply === 'ok';
        } catch (error) {
            console.error('Redis Health Check Failed:', error);
            return false;
        }
    }

    public async set(value: string): Promise<void> {
        const db: any = await this.db;
        await db.SADD(UserDB.KEY, value);
    }

    public async get(): Promise<string[]> {
        const db: any = await this.db;
        return await db.SMEMBERS(UserDB.KEY);
    }
}

const db: UserDB = new UserDB();
db.set('Hello');
db.get().then((values) => console.log(values));
