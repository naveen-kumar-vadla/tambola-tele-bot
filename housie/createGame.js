const {createGame} = require("./game_service");
const tambola = require('tambola-generator');

const game = {
  "status": "DRAFTED",
  "name": "Away day 2019",
  "sequence": [],
  "revealed": [],
  "winners": {
    "firstLine": null,
    "secondLine": null,
    "thirdLine": null,
    "fullHousie": null
  },
  "registeredPlayers": [],
  "players": []
};


(async () => {
  game.sequence = tambola.getDrawSequence();
  const created = await createGame(game);
  console.log(created.result);
  return;
})();
