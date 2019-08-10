const {signup} = require("./housie/game_service");

(async () => {
 const result = await signup({
    id: "12345",
    chatId: "1234",
    name: "Mahesh Kumar Kolla",
    numberOfTickets: 5
  });
  console.log(result);
})();
