var fetch = require('node-fetch');
var qs = require('qs');

class SlackHelper {
  constructor(token) {
    this.token = token;
  }

  authorize(code) {
    return new Promise((resolve, reject) => {
      fetch('https://slack.com/api/oauth.access?code=' +
          code +
          '&client_id=' + process.env.CLIENT_ID +
          '&client_secret=' + process.env.CLIENT_SECRET, {
            method: "GET",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          })
        .then((resp) => resp.json())
        .then(function (data) {
          resolve(data);
        }, function (error) {
          resolve(error);
        });
    });
  }

  addReaction(token, value, message) {
    fetch('https://slack.com/api/reactions.add', {
        method: "POST",
        body: qs.stringify({
          token: token,
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

  postMessage(channel, text, username, as_user = false) {
    return new Promise((resolve, reject) => {
      fetch('https://slack.com/api/chat.postMessage', {
          method: "POST",
          body: qs.stringify({
            token: process.env.OAUTH_ACCESS_TOKEN,
            channel: channel.id ? channel.id : channel,
            text: text,
            as_user: as_user,
            username: username
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        })
        .then((resp) => resp.json())
        .then(function (data) {
          resolve(data);
        })
        .catch(function (error) {
          resolve("Major flop", error);
        });
    });
  }
}

module.exports = SlackHelper;