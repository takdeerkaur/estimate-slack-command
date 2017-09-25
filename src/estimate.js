const SlackHelper = require('./slackHelper');
const StoryPoints = require('./storyPoints');

class Estimate {
	constructor(token) {
		this.token = token;
		this.storyPoints = new StoryPoints();
		this.slackHelper = new SlackHelper(this.token);
		this.estimates = [];
		this.estimationInProgress = false;
		this.currentEstimation = {};
	}

	// Estimate.prototype.createErrorAttachment = (error) => ({
	// 	color: 'danger',
	// 	text: `*Error*:\n${error.message}`,
	// 	mrkdwn_in: ['text'],
	// 	response_type: 'ephemeral'
	// });

	// Estimate.prototype.createSuccessAttachment = (message) => ({
	// 	color: 'good',
	// 	text: `${message}`,
	// 	mrkdwn_in: ['text']
	// });

	// Estimate.prototype.createAttachment = (result) => {
	// 	if (result.constructor === Error) {
	// 		return createErrorAttachment(result);
	// 	}

	// 	return createSuccessAttachment(result);
	// };

	createBaseEstimate(ticket) {
		let baseEstimate = {};
		// 1. if estimate: post message with ticket number + ticket description from JIRA + emoji reactions of SP options
		// this._getJiraTicket('ADVP-1000');
		if (this.estimationInProgress) {
			baseEstimate.text = `There is already an estimation in progress. Please /estimate close before creating a new one.`;
			baseEstimate.response_type = 'in_channel';
		} else {
			this.estimationInProgress = true;
			this.currentEstimation = {
				ticket: ticket
			}
			baseEstimate.text = `Estimation in progress for: ${ticket}`;
			baseEstimate.response_type = 'in_channel';
			baseEstimate.attachments = [{
				color: 'good',
				text: `${ticket}`,
				mrkdwn_in: ['text']
			}];
		};

		return baseEstimate;
	};

	revealEstimates(body) {
		let self = this;
		console.log("unsorted", this.estimates);
		self.estimates.sort(function (a, b) {
			return a.value > b.value;
		});
		console.log("sorted", this.estimates);

		self.slackHelper.postMessage(body.channel, `Revealing estimates for ${this.currentEstimation.ticket}!`)
			.then(function (newMessage) {
				self.estimates.forEach(function (value) {
					console.log("this value", value);
					self.slackHelper.addReaction(value, newMessage);
				});

				self.estimates = [];
				self.estimationInProgress = false;
				self.currentEstimation = {};
			});
	}

	addEstimate(point, user_id, user_name, channel_id) {
		let addedEstimate = {};

		if (this.estimationInProgress) {
			let alreadyVoted = this.estimates.findIndex(function(estimate) {
				return estimate.user === user_id;
			});

			if(alreadyVoted > -1) {
				this.estimates[alreadyVoted].emoji = point.emoji;
				this.estimates[alreadyVoted].value = point.value;
			}
			else {
				this.estimates.push({
					emoji: point.emoji,
					user: user_id,
					value: point.value
				});

				this.currentEstimation.count = this.currentEstimation.count ? this.currentEstimation.count + 1 : 1;
				this.slackHelper.postMessage(channel_id, `${user_name} has voted! We now have ${this.currentEstimation.count} total votes.`);
			}

			addedEstimate.text = `You voted :${point.emoji}:`;
		} else {
			addedEstimate.text = `There is no estimation currently in progress. Please /estimate *ticket_number* to create a new one.`;
			addedEstimate.response_type = 'in_channel';
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

	help() {
		let helpResponse = {};

		helpResponse.response_type = 'ephemeral';
		
		if (this.estimationInProgress) {
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

			if (!message || message === 'help') {
				resolve(this.help());
			}
			else if(this.estimationInProgress) {
				if(validPoint) {
					console.log("this is body of valid point", body);
					resolve(this.addEstimate(validPoint, body.user_id, body.user_name, body.channel_id));
				}
				else if(message === 'close') {
					resolve(this.beginClose());
				}
				else {
					let invalidEstimate = {};
					invalidEstimate.text = `${message} is not a valid story point. Please enter a valid fibonnaci number between 0 - 13`;
					invalidEstimate.response_type = 'ephemeral';
					resolve(invalidEstimate);
				}
			}
			else {
				resolve(this.createBaseEstimate(message));
			}
		});
	}
}

module.exports = Estimate;