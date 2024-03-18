import env from 'process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fsPromise } from 'fs';
import fs from 'fs';
import mimeTypes from 'mime-types';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class FilesController {
  static async postUpload(req, res) {
    const xToken = req.header('X-Token');
    if (!xToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = await redisClient.get(`auth_${xToken}`);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const usersCol = dbClient.db.collection('users');
    const user = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }

    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      res.status(400).json({ error: 'Missing or invalid type' });
      return;
    }

    if (type !== 'folder' && !data) {
      res.status(400).json({ error: 'Missing data' });
      return;
    }

    const filesColl = dbClient.db.collection('files');

    // Check if parentId is provided and valid
    if (parentId !== 0) {
      const parentFile = await filesColl.findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (parentFile.type !== 'folder') {
        res.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }

    let localPath = '';
    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = uuidv4();
      localPath = path.join(folderPath, fileName);

      try {
        await fs.promises.mkdir(folderPath, { recursive: true });
      
        const fileData = Buffer.from(data, 'base64');
        await fs.promises.writeFile(localPath, fileData);
      } catch (error) {
        console.error('Error writing file to disk:', error);
        res.status(500).json({ error: 'Failed to store file on disk' });
        return;
      }
    }

    const newFile = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: new ObjectId(parentId),
      localPath: type !== 'folder' ? localPath : null,
    };

    try {
      const result = await filesColl.insertOne(newFile);
      console.log(`This is the result ${result}`);
      if (!result || !result.ops || result.ops.length === 0) {
        throw new Error('Failed to insert document into database');
      }
    
      const insertedFile = result.ops[0];
      console.log('File inserted successfully:', insertedFile);
      res.status(201).json(insertedFile);
    } catch (error) {
      console.error('Error saving file to database:', error);
      res.status(500).json({ error: 'Failed to save file in database' });
    }
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
    const parentId = req.query.parentId || null;
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

    if (parentId !== null) {
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

static async putPublish(req, res) {
  const xToken = req.header('X-Token');
  if (!xToken){
    res.statusCode = 401
    return res.send({error: 'Unauthorized'});
  } 
  const userId = await redisClient.get(`auth_${xToken}`);
  if (!userId) {
    res.statusCode = 401
    return res.send({error: 'Unauthorized'})
  }
  const fileId = req.params.id;
  if (!ObjectId.isValid(fileId)) {
    res.statusCode = 404
    return res.send({error: 'Not found'});
  }
  const userCol = dbClient.db.collection('users');
  const user = await userCol.findOne({_id: new ObjectId(userId)});
  if (!user) {
    res.statusCode = 401
    return res.send({error: 'Unauthorized'});
  }
  const filesColl = dbClient.db.collection('files');
  const file = await filesColl.findOne({ _id: new ObjectId(fileId), userId });
  if (!file) {
    res.statusCode = 404
    return res.send({error: 'Not found'});
  }
  await filesColl.updateOne({_id: new ObjectId(fileId)}, { $set: {isPublic: true}});
  res.statusCode = 200
  return res.json(file);
}

static async putUnpublish(req, res) {;
  const xToken = req.header('X-Token');
  if (!xToken){
    res.statusCode = 401
    return res.send({error: 'Unauthorized'});
  } 
  const userId = await redisClient.get(`auth_${xToken}`);
  if (!userId) {
    res.statusCode = 401
    return res.send({error: 'Unauthorized'})
  }
  const fileId = req.params.id;
  if (!ObjectId.isValid(fileId)) {
    res.statusCode = 404
    return res.send({error: 'Not found'});
  }
  const userCol = dbClient.db.collection('users');
  const user = await userCol.findOne({_id: new ObjectId(userId)});
  if (!user) {
    res.statusCode = 401
    return res.send({error: 'Unauthorized'});
  }
  const filesColl = dbClient.db.collection('files');
  const file = await filesColl.findOne({ _id: new ObjectId(fileId), userId });

  if (!file) {
    res.statusCode = 404
    return res.send({error: 'Not found'});
  }

  await filesColl.updateOne({_id: new ObjectId(fileId)}, { $set: {isPublic: false } });

  res.statusCode = 200
  return res.json(file);
}

static async getFile(req, res) {
  const size = req.query.size || null
  const xToken = req.header('X-Token');
  if (!xToken){
    res.statusCode = 401
    return res.send({error: 'Unauthorized'});
  } 
  const userId = await redisClient.get(`auth_${xToken}`);
  if (!userId) {
    res.statusCode = 401
    return res.send({error: 'Unauthorized'})
  }
  const fileId = req.params.id;
  if (!ObjectId.isValid(fileId)) {
    res.statusCode = 404
    return res.send({error: 'Not found fileId'});
  }
  const filesColl = dbClient.db.collection('files');
  const file = await filesColl.findOne({ _id: new ObjectId(fileId)});
  console.log(`The file${file}`)

  if (!file) {
    res.statusCode = 404
    return res.send({error: 'Not found file'});
  }

  if(!file.isPublic && file.userId !== userId) {
    res.statusCode = 404
    return res.send({error: 'Not found file and userId'})
  }

  if(file.type === 'folder') {
    res.statusCode = 400
    return res.send({ error: 'A folder doesn\'t have content' })
  }
  let filePath = file.localpath;
  console.log(`This is the filepath ${filePath}`)

  if (!fs.existsSync(filePath)) {
    res.statuscode = 404
    return res.send({error: 'Not found filepath'});
  }

  const fileContent = fs.readFileSync(filePath);
  const mimeType = mimeTypes.lookup(filePath);
  
  res.set('Content-Type', mimeType);
  res.send(fileContent);
}
}

  
