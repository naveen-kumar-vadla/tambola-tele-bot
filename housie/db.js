const MongoClient = require('mongodb').MongoClient;
const {database} = require("../config");

const connection = () => {
  return MongoClient.connect(database.url, {useNewUrlParser: true})
      .then(client => client.db(database.name))
      .catch(err => console.log("Error: ", err));
};

const insert = async (collectionName, document) => {
  const db = await connection();
  console.log(db);
  const collection = db.collection(collectionName);
  let result = await collection.insert(document);
  console.log(result);
};

module.exports = {insert};
