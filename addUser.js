const dbClient = require('./utils/db');

(async () => {
    try {
        await dbClient.connect(); // Connect to MongoDB
        console.log('Connection status:', await dbClient.isAlive());

        const user = {
            username: 'example_user',
            email: 'user@example.com',
            password: 'password123'
        };

        await dbClient.addUser(user); // Add a user
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await dbClient.client.close(); // Close the MongoDB connection
    }
})();
