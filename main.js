import redisClient from './utils/redis';

(async () => {
  while(!redisClient.isAlive()) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(redisClient.isAlive(), "Redis is alive");
  console.log(await redisClient.get('myKey'));
  await redisClient.set('myKey', 12, 5);
  console.log(await redisClient.get('myKey'));

    
setTimeout(async () => {
      console.log(await redisClient.get('myKey'));
    }, 1000 * 10);
  })();
