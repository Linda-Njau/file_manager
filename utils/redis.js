const redis = require('redis');
import { promisify } from 'util';

class RedisClient{
    constructor() {
        this.client = redis.createClient();
        this.getAsync = promisify(this.client.get).bind(this.client);
        this.client.on('error', (error) => {
            console.error(`Redis connection error: ${error}`);
        });
        this.client.on('connect', () => {

        });
    }
    isAlive(){
        return this.client.connected;
    }
    async get(key){
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    async set(key, value, duration) {
        return new Promise((resolve, reject) => {
            this.client.setex(key, value, duration, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve('OK');
                }
            });
        });
    }
    async del(key) {
        return new Promise((resolve, reject) => {
            this.client.del(key, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve('OK');
                }
            });
        });
    }
}
const redisClient = new RedisClient();
module.exports = redisClient;
