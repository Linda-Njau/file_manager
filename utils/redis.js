import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    // Handle Redis connection error
    this.client.on('error', (error) => {
      console.log(`Redis connection error: ${error}`);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async set(key, value, expiration) {
    return new Promise((resolve, reject) => {
      this.client.setex(key, expiration, value, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve('OK');
        }
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
