const db = require("./db");
const fs = require("fs");


const createGame = () => {
  let newGame = JSON.parse(fs.readFileSync("./NewGame.json", "utf-8"));
  let collectionName = "housie";
  db.insert(collectionName, newGame);
};

createGame();
