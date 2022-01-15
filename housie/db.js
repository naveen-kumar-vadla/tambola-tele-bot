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
  // Create blockedUsers
  getBlockedUser();
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
  removeBlockedUsers();
  return collection.deleteOne({_id: game._id});
};

const removeBlockedUsers = async () => {
  const collection = db.collection("blocked_users");
  const blockedUsers = await collection.findOne();
  blockedUsers.ids = [];
  return collection.updateOne({_id: blockedUsers._id}, {$set: blockedUsers});
};

const blockUser = async (chatId) => {
  const collection = db.collection("blocked_users");
  let blockedUsers = await collection.findOne();
  blockedUsers.ids.push(chatId);
  return collection.updateOne({_id: blockedUsers._id}, {$set: blockedUsers});
};

const getBlockedUser = async () => {
  const collection = db.collection("blocked_users");
  const blocked = await collection.findOne();
  if(!blocked) {
    collection.insertOne({ ids: [] });
    return { ids:[] };
  }
  return blocked;
};

module.exports = {insert, find, update, remove, blockUser, getBlockedUser};
