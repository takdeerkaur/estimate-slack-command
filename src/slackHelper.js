var fetch = require('node-fetch');
var qs = require('qs');

class SlackHelper {
  constructor(token) {
    this.token = token;
  }

  addReaction(value, message) {
    fetch('https://slack.com/api/reactions.add', {
      method: "POST",
      body: qs.stringify({
        token: 'xoxp-8003773904-8003930263-228139192273-fda00f27d104a7ef4e8fc5a4d4125c3f',
        name: value.emoji,
        channel: message.channel,
        timestamp: message.ts
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
    .then((resp) => resp.json())
    .then(function (data) {
        return data;
    }, function (error) {
        return error;
    });
  }

  postMessage(channel, text) {
    return new Promise((resolve, reject) => {
      fetch('https://slack.com/api/chat.postMessage', {
          method: "POST",
          body: qs.stringify({
            token: 'xoxp-8003773904-8003930263-228139192273-fda00f27d104a7ef4e8fc5a4d4125c3f',
            channel: channel.id ? channel.id : channel,
            text: text,
            as_user: false
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        })
        .then((resp) => resp.json())
        .then(function (data) {
          console.log("this data", data);
          resolve(data);
        })
        .catch(function (error) {
          console.log(error);
          resolve("Major flop");
        });
    });
  }
}

module.exports = SlackHelper;