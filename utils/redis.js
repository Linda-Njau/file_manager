import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (error) => {
      console.log(`Redis connection error: ${error}`);
    });
    this.connect();
  }

  async connect() {
      await this.client.connect();
    }

  isAlive() {
    return this.client.isReady;
  }

  async get(key) {
    return await this.client.get(key);
  }

  async set(key, value, expiration) {
    await this.client.set(key, value, {EX: expiration});
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
