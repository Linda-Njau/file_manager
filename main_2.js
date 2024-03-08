import dbClient from './utils/db';

const waitConnection = () => {
    return new Promise((resolve, reject) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                i += 1;
                if (i >= 10) {
                    reject();
                } else if (!dbClient.isAlive()) {
                    repeatFct();
                } else {
                    resolve();
                }
            }, 1000);
        };
        repeatFct();
    });
};

const main = async () => {
    try{
        console.log(await dbClient.isAlive());
        await waitConnection();
        console.log(await dbClient.isAlive());
        console.log(await dbClient.nbUsers());
        console.log(await dbClient.nbFiles());

        const newUser = {
            username: 'john_doe',
            email: 'john@example.com',
            password: 'johnsPassword'
        };
        await dbClient.addUser(newUser);
    } catch (error) {
        console.error('Error:', error);
    }
    
};

main();
