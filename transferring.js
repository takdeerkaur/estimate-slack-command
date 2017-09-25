'use strict';

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM(`<!DOCTYPE html>`);
const $ = require('jQuery')(window);

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

let storyPoints = [
    {
        emoji: 'zero',
        value: 0
    },
    {
        emoji: 'one',
        value: 1
    },
    {
        emoji: 'two',
        value: 2
    },
    {
        emoji: 'three',
        value: 3
    },
    {
        emoji: 'four',
        value: 4
    },
    {
        emoji: 'five',
        value: 5
    },
    {
        emoji: 'six',
        value: 6
    },
    {
        emoji: 'seven',
        value: 7
    },
    {
        emoji: 'eight',
        value: 8
    },
    {
        emoji: 'nine',
        value: 9
    },
    {
        emoji: 'keycap_ten',
        value: 10
    },
];

let estimates = [];


var PlanoBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'planobot';
    this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'norrisbot.db');

    this.user = null;
    this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(PlanoBot, Bot);

PlanoBot.prototype.run = function () {
    PlanoBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

PlanoBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

PlanoBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

PlanoBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

PlanoBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

PlanoBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Chuck Norris` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

PlanoBot.prototype._onMessage = function (message) {
    // this._isMentioningPlanoBot(message)
    console.log("message!");
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromPlanoBot(message)
    ) {
        if(message.text === 'end') {
            this._revealEstimates(message);
        }
        else if(this._isValidStoryPoint(message.text)) {
            this._receiveUserEstimate(message);
        }
        else {
            this._createBaseEstimate(message);
        }
    }
};

PlanoBot.prototype._isChatMessage = function (message) {
    console.log("in chat", message.type === 'message' && Boolean(message.text));
    return message.type === 'message' && Boolean(message.text);
};

PlanoBot.prototype._isChannelConversation = function (message) {
    console.log("in channel", typeof message.channel === 'string' &&
        message.channel[0] === 'C');
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

PlanoBot.prototype._isFromPlanoBot = function (message) {
    console.log("the mesage", message);
    console.log("is from planoto", message.user === this.user.id);
    return message.user === this.user.id;
};

PlanoBot.prototype._isMentioningPlanoBot = function (message) {
    console.log("mentions plano", message.text.includes(this.user.id) ||
        message.text.toLowerCase().includes(this.name));
    return message.text.includes(this.user.id) ||
        message.text.toLowerCase().includes(this.name);
};

PlanoBot.prototype._createBaseEstimate = function (originalMessage) {
    var self = this;
    // 1. if estimate: post message with ticket number + ticket description from JIRA + emoji reactions of SP options
    // this._getJiraTicket('ADVP-1000');
    var channel = self._getChannelById(originalMessage.channel);
    self.postMessageToChannel(channel.name, originalMessage.text, {as_user: true})
        .then(function(response) {
            let botMessage = response.message;
            botMessage.channel = response.channel;
            console.log('botmessg', botMessage);
            // this._addReaction('thumbsup', botMessage);
        });
    // self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
    //     if (err) {
    //         return console.error('DATABASE ERROR:', err);
    //     }

    //     var channel = self._getChannelById(originalMessage.channel);
    //     self.postMessageToChannel(channel.name, record.joke, {as_user: true});
    //     self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    // });
};

PlanoBot.prototype._isValidStoryPoint = function(input) {
    let validPoint = storyPoints.find(function(point) {
        return point.value === parseInt(input);
    });

    return validPoint;
}

PlanoBot.prototype._receiveUserEstimate = function (userMsg) {
    let validPoint = this._isValidStoryPoint(userMsg.text);

    if(validPoint) {
        estimates.push({
            emoji: validPoint.emoji,
            user: userMsg.user,
            value: validPoint.value
        });
    }
    else {
        // tell user it's crap
    }
};

PlanoBot.prototype._revealEstimates = function (planningMsg) {
    var self = this;

    estimates.sort(function(a, b) {
        return a.value < b.value;
    });

    estimates.forEach(function(value) {
        self._addReaction(value.emoji, planningMsg);
    });
    
    estimates = [];
};

PlanoBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

PlanoBot.prototype._addReaction = function (emoji, message) {
    console.log("what's happening here", message);
    $.post('https://slack.com/api/reactions.add', 
        {
            token: process.env.BOT_API_KEY,
            name: emoji,
            channel: message.channel,
            timestamp: message.ts
        }, 
        function(data) {
            console.log('ti workied', data);
    }).fail(function(error) {
        console.log("nope!", error);
    });
};

PlanoBot.prototype._getJiraTicket = function (key) {
    $.get('http://jira.move.com/rest/api/2/issue/' + key, 
    {
        username: 'tjawanda',
        password: 'AqYXNTZ5f0Qm'
    }, 
    function(data) {
        console.log('hi jira', data);
    }).fail(function(error) {
        console.log("nope!", error);
    });
};

module.exports = PlanoBot;