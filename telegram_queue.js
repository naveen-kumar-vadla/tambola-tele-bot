let allMessages = [];

(() => {
  setInterval(() => {
    if(allMessages.length === 0) {
      return 1;
    }
    console.log(`${new Date().toString()} Sending messages from queue....`);
    let messages = allMessages.shift();
    messages.forEach(message => {
      message();
    });
  },500);
})();


const push = (message) => {
  let length = allMessages.length;
  if(length === 0 || allMessages[length-1].length >= 15) {
    allMessages.push([message]);
  } else {
    allMessages[length-1].push(message);
  }
  return 1;
};


module.exports = {push};
