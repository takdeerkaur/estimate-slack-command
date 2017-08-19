'use strict';

const request = require('request')

var SlackHelper = function Constructor() {
};

SlackHelper.prototype.addReaction = (token, emoji, message) => {
  console.log("what's happening here", message);
  console.log("token", token);

  request.post(
    'https://slack.com/api/reactions.add', {
      token: token,
      name: emoji,
      channel: message.channel,
      timestamp: message.ts
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body)
      } else {
        console.log("nope!", error);
      }
    }
  );
};

module.exports = SlackHelper;