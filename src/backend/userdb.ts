import {createClient, RedisClientType} from 'redis';

/**
 * Database to store user data.
 */
export class UserDB {
  private readonly KEY = 'msgId';
  private db: RedisClientType;

  constructor() {
    this.db = createClient();
    this.db.on('error', (err: any) => console.error('Redis error: ', err));
    this.db.connect();
  }

  /**
   * Checks if the database is healthy.
   * 
   * @returns True if the database is healthy, false otherwise.
   */
  private async health(): Promise<boolean> {
    try {
      await this.db.set('health', 'ok');
      const reply: string | null = await this.db.get('health');
      return reply === 'ok';
    } catch (error) {
      console.error('Redis Health Check Failed:', error);
      return false;
    }
  }

  /**
   * Adds a message ID to the database.
   * 
   * @param msgId The message ID to add.
   */
  public async add(msgId: string): Promise<void> {
    await this.db.SADD(this.KEY, msgId);
  }

  /**
   * Removes a message ID from the database.
   * 
   * @param msgId The message ID to remove.
   */
  public async remove(msgId: string): Promise<void> {
    await this.db.SREM(this.KEY, msgId);
  }

  /**
   * Retrieves all message IDs from the database.
   * 
   * @return All message IDs in the database.
   */
  public async get(): Promise<string[]> {
    return this.db.SMEMBERS(this.KEY);
  }

  /**
   * Checks if a message ID is in the database.
   * 
   * @param msgId The message ID to check.
   * 
   * @returns True if the message ID is in the database, false otherwise.
   */
  public async has(msgId: string): Promise<boolean> {
    return this.db.SISMEMBER(this.KEY, msgId);
  }
}

// const db: UserDB = new UserDB();
// db.add('Hello');
// db.has('Hello').then((value) => console.log(value));
// db.get().then((values) => console.log(values));
// db.remove('Hello');
// db.has('Hello').then((value) => console.log(value));
