import env from 'process';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromise } from 'fs';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class FilesController {
  static async postUpload(req, res) {
    const xToken = req.header('X-Token');

    const userId = await redisClient.get(`auth_${xToken}`);
    if (!userId) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }
    const usersCol = dbClient.db.collection('users');
    const user = await usersCol.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }

    const fileTypes = ['folder', 'file', 'image'];

    const {
      name, type, parentId = null, isPublic = false, data = '',
    } = req.body;

    if (!name) {
      res.statusCode = 400;
      return res.send({ error: 'Missing name' });
    }

    if (!type || !fileTypes.includes(type)) {
      res.statusCode = 400;
      return res.send({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      res.statusCode = 400;
      return res.send({ error: 'Missing data' });
    }

    const filesColl = dbClient.db.collection('files');

    if (parentId !== null) {
      const file = await filesColl.findOne({ _id: new ObjectId(parentId) });
      if (!file) {
        res.statusCode = 400;
        return res.send({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        res.statusCode = 400;
        return res.send({ error: 'Parent is not a folder' });
      }
      if (file.type === 'folder') {
        const folderPath = file.localpath;
        const filePath = `${folderPath}/${name}`;
        const dataDecoded = Buffer.from(data, 'base64');
        await fsPromise.mkdir(folderPath, { recursive: true });
        if (type !== 'folder') {
          await fsPromise.writeFile(filePath, dataDecoded);
        } else {
          await fsPromise.mkdir(filePath);
        }

        const newFile = await filesColl.insertOne({
          userId,
          name,
          type,
          isPublic,
          parentId,
          localpath: filePath,
        });

        res.statusCode = 201;
        return res.send({
          id: newFile.insertedId,
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      }
    } else {
      const folderPath = env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = uuidv4();
      const filePath = `${folderPath}/${fileName}`;
      const dataDecoded = Buffer.from(data, 'base64');

      await fsPromise.mkdir(folderPath, { recursive: true });
      if (type !== 'folder') {
        await fsPromise.writeFile(filePath, dataDecoded);
      } else {
        await fsPromise.mkdir(filePath);
      }

      const newFile = await filesColl.insertOne({
        userId,
        name,
        type,
        isPublic,
        parentId: 0,
        localpath: filePath,
      });

      res.statusCode = 201;

      return res.send({
        id: newFile.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId: 0,
      });
    }
    return res.send();
  }
  static async getShow (req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
        res.statusCode = 404;
        return res.send({ error: 'Unauthorized' });        
    }
    const userId = await redisClient.get(`auth_${xToken}`)
    console.log(`This is the userId: ${userId}`)
    if (!userId) {
        res.statusCode = 404;
        return res.send({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
        res.statusCode = 404;
        return res.send({ error: 'Not Found' });
    }
    console.log(`FileId:  ${fileId}`)
    const userCol = dbClient.db.collection('users');
    const user = await userCol.findOne({_id: new ObjectId(userId)});
    if (!user) {
        res.statusCode = 401;
        return res.send({ error: 'Unauthorized' });
    }
    console.log(`User: ${user}`)
    const filesColl = dbClient.db.collection('files');
    const file = await filesColl.findOne({_id: new ObjectId(fileId), userId })
    if (!file) {
        res.statusCode = 404;
        return res.send({ error: 'Not Found' });
    }
    console.log(`File ${file}`)

    res.statusCode = 200;
    return res.json(file)
}
static async getIndex(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
        res.statusCode = 401;
        return res.send({error: 'Unauthorized'});
    }
    const userId = await redisClient.get(`auth_${xToken}`);
    console.log(`User id: ${userId}`)
    if (!userId) {
        res.statusCode = 401;
        return res.send({error: 'Unauthorized'});
    }
    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page) || 0;
    const perPage = 20;
    const skip = page * perPage;

    const userCol = dbClient.db.collection('users');
    const user = await userCol.findOne({_id: new ObjectId(userId)});
    if (!user) {
        res.statusCode = 401;
        return res.send({error: 'Unauthorized'});
    }
    console.log(`User ${user}`)
    const filesColl = dbClient.db.collection('files');
    let query = { userId };

    if (parentId !== '0') {
        query.parentId = parentId;
    }

    const files = await filesColl
        .find(query)
        .limit(perPage)
        .skip(skip)
        .toArray();

    console.log(`files: ${files}`)
    res.statusCode = 200
    return res.json(files);
}
}

  
