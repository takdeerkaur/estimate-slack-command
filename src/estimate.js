const SlackHelper = require('./slackHelper');
const StoryPoints = require('./storyPoints');
const mongo = require('mongodb');
const db = require('monk')(process.env.MONGODB_URI);

class Estimate {
	constructor(token) {
		this.token = token;
		this.storyPoints = new StoryPoints();
		this.slackHelper = new SlackHelper(this.token);
		this.currentEstimations = [];
		this.users = [];
	}

	isAuthenticated(user_id) {
		return new Promise((resolve, reject) => {
			let collection = db.get('planobot');
			collection.findOne({
				user_id: user_id
			})
			.then((doc) => {
				console.log("is auth doc", doc);
				resolve(doc);
			});
		});
	}

	currentEstimation(channel) {
		return this.currentEstimations.find(function(estimate) {
			return estimate.channel === channel;
		});
	}

	currentEstimationIndex(channel) {
		return this.currentEstimations.findIndex(function(estimate) {
			return estimate.channel === channel;
		});
	}

	createBaseEstimate(ticket, channel) {
		let baseEstimate = {
			response_type: 'in_channel'
		};
		// 1. if estimate: post message with ticket number + ticket description from JIRA + emoji reactions of SP options
		// this._getJiraTicket('ADVP-1000');
		if (this.currentEstimation(channel)) {
			baseEstimate.text = `There is already an estimation in progress in this channel. Please /estimate close before creating a new one.`;
		} 
		else {
			this.currentEstimations.push({
				ticket: ticket,
				channel: channel,
				estimates: [],
				count: 0
			});

			baseEstimate.text = `Estimation in progress for: \`${ticket}\``;
		};

		return baseEstimate;
	};

	revealEstimates(body) {
		let self = this;
		let channel = body.channel.id;
		let currentEstimate = this.currentEstimation(channel);
		let estimates = currentEstimate.estimates.sort(function (a, b) {
			return a.value - b.value;
		});
		let storyPoint = this.calculateStoryPoints(estimates);

		console.log("final estimates", estimates);

		self.slackHelper.postMessage(channel, `Revealing estimates for \`${currentEstimate.ticket}\`!`, null, false, null, `:sparkles:`)
			.then(function (newMessage) {
				estimates.forEach(function (value) {
					self.isAuthenticated(value.user_id)
						.then(function(user) {
							console.log("this user", user);
							if(user) {
								self.slackHelper.addReaction(user.token, value, newMessage);
							}
							else {
								self.slackHelper.postMessage(channel, `${value.username} has not authenticated, but voted :${value.emoji}:`, value.username, false, newMessage.ts, `:${value.emoji}:`);
							}
						})
				});

				self.slackHelper.postMessage(channel, `The magically agreed upon story point for ticket \`${currentEstimate.ticket}\` is :${storyPoint.emoji}: :tada:`, null, false, null, `:${storyPoint.emoji}:`);
				self.currentEstimations.splice(self.currentEstimationIndex(channel), 1);
			});
	}

	calculateStoryPoints(points) {
		let initialFreq = {
			map: new Map(),
			max: {
				value: 0,
				emoji: 'zero'
			}
		};

		let freq = points.reduce(function(freq, current) {
			let currentMaxFreq = freq.map.get(freq.max); 
			let currentVal = current.value;
			freq.map.set(currentVal, freq.map.get(currentVal) ? freq.map.get(currentVal) + 1 : 1);
			if(!currentMaxFreq || freq.map.get(currentVal) >= currentMaxFreq) {
				freq.max = current;
			}
			return freq;	
		}, initialFreq);

		return freq.max;
	}

	addEstimate(point, user_id, user_name, channel_id) {
		let addedEstimate = {};
		let currentEstimate = this.currentEstimation(channel_id);

		console.log("what is current estimate", currentEstimate);

		if (currentEstimate) {
			let estimates = currentEstimate.estimates;
			console.log("current estimates", estimates);
			let alreadyVoted = estimates.findIndex(function(estimate) {
				return estimate.user_id === user_id;
			});
			console.log("already voted/?", alreadyVoted);

			if(alreadyVoted > -1) {
				estimates[alreadyVoted].emoji = point.emoji;
				estimates[alreadyVoted].value = point.value;
			}
			else {
				estimates.push({
					emoji: point.emoji,
					user_id: user_id,
					username: user_name,
					value: point.value
				});

				currentEstimate.count++;
				// do in thread
				this.slackHelper.postMessage(channel_id, `${user_name} has voted! We now have ${currentEstimate.count} total votes.`, user_name);
			}

			addedEstimate.text = `You voted :${point.emoji}:`;

			this.isAuthenticated(user_id)
				.then(function(user) {
					if(!user) {
						let unauthenticatedUser = {
							"text": `You voted :${point.emoji}: \nYou must authenticate before being able to estimate using reactions. To do so, please add this app to Slack via ${process.env.BASE_URL}/add.`
						}
						return unauthenticatedUser;
					}
				});
		} else {
			addedEstimate.text = `There is no estimation currently in progress. Please /estimate *ticket_number* to create a new one.`;
			addedEstimate.response_type = 'ephemeral';
		}

		return addedEstimate;
	}

	beginClose() {
		return {
			response_type: 'ephemeral',
			attachments: [{
				"fallback": "Nope",
				"title": `Are you sure you want to close this?`,
				"callback_id": "close_estimation",
				"color": "#3AA3E3",
				"attachment_type": "default",
				"actions": [{
						"name": "cancel",
						"text": "Nope",
						"type": "button",
						"value": "cancel"
					},
					{
						"name": "confirm",
						"text": "Yes, please",
						"type": "button",
						"value": "confirm"
					}
				]
			}]
		};
	}

	help(channel) {
		let helpResponse = {};

		helpResponse.response_type = 'ephemeral';
		
		if (this.currentEstimation(channel)) {
			helpResponse.text = "To end the current estimation in progress, enter `/estimate close`! You must close the current estimation before beginning a new one."

		} else {
			helpResponse.text = "To begin an estimation, enter `/estimate` along with your ticket. eg. `/estimate ADVP-1234`. \n Add estimates (visible only to you) with `/estimate` along with a valid story point. ie. numbers between 0 - 10. \n To reveal estimates and end the current estimation, hit `/estimate close`. The previous estimation must be closed before a new one can begin. \n Happy storypointing!"
		}

		return helpResponse;
	}

	execute(body) {
		return new Promise((resolve, reject) => {
			if (body.token !== this.token) {
				resolve({
					text: '',
					attachments: [{
						color: 'danger',
						text: `*Error*:\n Invalid Token`,
						mrkdwn_in: ['text'],
						response_type: 'ephemeral'
					}]
				});
			}

			const message = body.text;
			const validPoint = this.storyPoints.isValidStoryPoint(message);
			const channel = body.channel_id;
			let currentEstimate = this.currentEstimation(channel);

			if (!message || message === 'help') {
				resolve(this.help(channel));
			}
			else if(validPoint) {
				resolve(this.addEstimate(validPoint, body.user_id, body.user_name, channel));
			}
			else if(currentEstimate) {
				if(message === 'close') {
					resolve(this.beginClose());
				}
				else {
					let invalidEstimate = {};
					invalidEstimate.text = `${message} is not a valid story point. Please enter a valid fibonnaci number between 1 - 13`;
					invalidEstimate.response_type = 'ephemeral';
					resolve(invalidEstimate);
				}
			}
			else {
				resolve(this.createBaseEstimate(message, channel));
			}
		});
	}
}

module.exports = Estimate;