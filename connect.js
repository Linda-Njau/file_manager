import { createClient } from 'redis';

const client = createClient();
console.log(client)

client.on('error', err => console.log('Redis Client Error', err));

(async () => {
    await client.connect();
    console.log(client)
}) ();

