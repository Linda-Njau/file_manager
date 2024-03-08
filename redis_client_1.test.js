import chai from 'chai';
import sinon from 'sinon';

sinon.stub(console, 'log');

import redisClient from './utils/redis.js';

describe('redisClient test', () => {    
    it('isAlive when redis started', (done) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                i += 1;
                if (i >= 5) {
                    chai.assert.isTrue(false);
                    done()
                }
                else if(!redisClient.isAlive()) {
                    repeatFct()
                }
                else {
                    chai.assert.isTrue(true);
                    done()
                }
            }, 1000);
        }
        repeatFct();
    }).timeout(10000);
});
