const { MongoClient } = require('mongodb');

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || '127.0.0.1';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';
    
        const url = `mongodb://${host}:${port}`;
        this.client = new MongoClient(url, { family: 4 });
        this.client.connect()
        this.db = this.client.db(database);
    }

    async isAlive() {
      try {
        await this.client.connect();
        return true;
      } catch (e) {
        console.error('Error connecting to MongoDB: ', e);
        return false;
      }
    }

    async nbUsers() {
        const usersCollection = this.db.collection('users');
        const nbUsers = await usersCollection.countDocuments();
        return nbUsers;
    }

    async nbFiles() {
        const filesCollection = this.db.collection('files');
        const nbFiles = await filesCollection.countDocuments();
        return nbFiles;
    }

    async addUser(user) {
        const userCollection = this.db.collection('users');
        const result= await userCollection.insertOne(user);
        console.log(`User added with id ${result.insertedId}`);
        return result.insertedId;
    }
}

const dbClient = new DBClient();

module.exports = dbClient;
