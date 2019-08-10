const {signup, getRegisteredPlayers, revealNumber, confirmPlayer, mark} = require("./housie/game_service");
(async () => {
 // var result = await signup({
 //    id: "12345",
 //    chatId: "1234",
 //    name: "Mahesh Kumar Kolla",
 //    numberOfTickets: 2
 //  });
 //  console.log(result);
 //
 //  var result = await getRegisteredPlayers();
 //  console.log(result);
 //
 //  await confirmPlayer("12345");
 //
 //  await revealNumber();

  var result = await mark( {
    playerId: "12345",
    ticketId: "uq2ryK_xaC",
    number: 80
  });
  console.log(result);
})();
