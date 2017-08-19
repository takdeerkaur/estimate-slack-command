'use strict';

const StoryPoints = require('./storyPoints');
const SlackHelper = require('./slackHelper');
const Action = require('./action');

var Estimate = function Constructor(token) {
	this.token = token;
	this.storyPoints = new StoryPoints();
	this.estimates = [];
	this.estimationInProgress = false;
};

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

Estimate.prototype.createBaseEstimate = (ticket) => {
	let baseEstimate = {};
	console.log("are we creating base");
	// 1. if estimate: post message with ticket number + ticket description from JIRA + emoji reactions of SP options
	// this._getJiraTicket('ADVP-1000');
	if (estimationInProgress) {
		baseEstimate.text = `There is already an estimation in progress. Please /estimate close before creating a new one.`;
		baseEstimate.response_type = 'in_channel';
	} else {
		estimationInProgress = true;
		baseEstimate.text = `Estimation in progress for: ${ticket}`;
		baseEstimate.response_type = 'in_channel';
		baseEstimate.attachments = {
			color: 'good',
			text: `${message}`,
			mrkdwn_in: ['text']
		};
	};

	return baseEstimate;
};

Estimate.prototype.revealEstimates = () => {
	estimates.sort(function (a, b) {
		return a.value < b.value;
	});

	estimates.forEach(function (value) {
		addReaction(slackToken, value.emoji, actionBody);
	});

	console.log("here are final estimates", estimates);

	estimates = [];
}

Estimate.prototype.addEstimate = (point, user_id) => {
	console.log("valid point", point);
	let addedEstimate = {};

	if (this.estimationInProgress) {
		this.estimates.push({
			emoji: point.emoji,
			user: user_id,
			value: point.value
		});

		addedEstimate.text = `You voted :${validPoint.emoji}:`;
	} else {
		console.log("what is the problem");
		addedEstimate.text = `There is no estimation currently in progress. Please /estimate *ticket_number* to create a new one.`;
		addedEstimate.response_type = 'in_channel';
	}

	return addedEstimate;
}

Estimate.prototype.beginClose = () => {
	return {
		text: `Wooot`,
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

Estimate.prototype.execute = (body) => new Promise((resolve, reject) => {
	console.log("this body", body);
	console.log("this current token", this.storyPoints);
	
	if (body.token !== this.token) {
		return resolve({
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

	if(!message || message === 'help') {
		console.log("did you mean to write one of thse?");
	}
	else if (validPoint) {
		resolve(this.addEstimate(validPoint, body.user_id));
	} else if (message === 'close') {
		return resolve(this.beginClose());
	} else {
		return resolve(this.createBaseEstimate(message));
	}

});

module.exports = Estimate;