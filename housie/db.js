const MongoClient = require('mongodb').MongoClient;
const {database} = require("../config");
const COLLECTION_NAME = "housie";
let db;

const connection = () => {
  return MongoClient.connect(process.env.DATABASE_URL || database.url, {useNewUrlParser: true})
      .then(client => client.db(database.name))
      .catch(err => console.log("Error: ", err));
};

(async () => {
  console.log("Wait until DB gets initialized....");
  db = await connection();
  console.log("DB initialized... continue...");
})();

const insert = async (document) => {
  const collection = db.collection(COLLECTION_NAME);
  return await collection.insertOne(document);
};

const find = async () => {
  const collection = db.collection(COLLECTION_NAME);
  return collection.findOne();
};

const update = async (game) => {
  const collection = db.collection(COLLECTION_NAME);
  return collection.updateOne({_id: game._id}, {$set: game});
};

const remove = async () => {
  const collection = db.collection(COLLECTION_NAME);
  const game = await find(db);
  return collection.deleteOne({_id: game._id});
};

module.exports = {insert, find, update, remove};
