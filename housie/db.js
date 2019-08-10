const MongoClient = require('mongodb').MongoClient;
const {database} = require("../config");
const COLLECTION_NAME = "housie";

const insert = async (document) => {
  const db = await connection();
  const collection = db.collection(COLLECTION_NAME);
  return await collection.insertOne(document);
};

const find = async () => {
  const db = await connection();
  const collection = db.collection(COLLECTION_NAME);
  return collection.findOne();
};

const update = async (game) => {
  const db = await connection();
  const collection = db.collection(COLLECTION_NAME);
  return collection.updateOne({_id: game._id}, {$set: game});
};

//private
const connection = () => {
  return MongoClient.connect(database.url, {useNewUrlParser: true})
      .then(client => client.db(database.name))
      .catch(err => console.log("Error: ", err));
};


module.exports = {insert, find, update};
