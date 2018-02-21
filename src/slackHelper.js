var fetch = require('node-fetch');
var qs = require('qs');

class SlackHelper {
  constructor(token, estimation) {
    this.token = token;
    this.estimation = estimation;
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

  addReaction(user_token, emoji, message) {
    return new Promise((resolve, reject) => {
      fetch('https://slack.com/api/reactions.add', {
          method: "POST",
          body: qs.stringify({
            token: user_token,
            name: emoji,
            channel: message.channel,
            timestamp: message.ts
          }),
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

  postMessage(channel_id, text, username, as_user = false, thread_ts = null, emoji, attachments = null) {
    return new Promise((resolve, reject) => {
      fetch('https://slack.com/api/chat.postMessage', {
          method: "POST",
          body: qs.stringify({
            token: process.env.OAUTH_ACCESS_TOKEN,
            channel: channel_id,
            text: text,
            as_user: as_user,
            username: username,
            thread_ts: thread_ts,
            icon_emoji: emoji,
            attachments: JSON.stringify(attachments)
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        })
        .then((resp) => resp.json())
        .then(function (data) {
          console.log(data);
          resolve(data);
        })
        .catch(function (error) {
          resolve("Major flop", error);
          console.log("Error posting message", error);
        });
    });
  }

  async delayedPost(response_url, channel_id, ticket) {
    if (!ticket) {
      return await this.estimation.revealEstimates(channel_id);
    } else {
      return await this.estimation.createBaseEstimate(ticket, channel_id);
    }
  }
}

module.exports = SlackHelper;