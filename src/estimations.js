const Estimate = require('./estimate');
const SlackHelper = require('./slackHelper');
const JiraHelper = require('./jiraHelper');
const StoryPoints = require('./storyPoints');
const mongo = require('mongodb');
const db = require('monk')(process.env.MONGODB_URI);

class Estimations {
	constructor(token) {
		this.token = token;
		this.storyPoints = new StoryPoints();
		this.jiraHelper = new JiraHelper();
		this.slackHelper = new SlackHelper(this.token);
		this.currentEstimations = [];
	}

	async isAuthenticated(user_id) {
		try {
			let collection = db.get('planobot');
			let user = await collection.findOne({
				user_id: user_id
			});

			return user;
		} catch (err) {
			console.log("This mongo connection didn't work bruh", err);
		}
	}

	currentEstimation(channel) {
		return this.currentEstimations.find(function (estimate) {
			return estimate.channel === channel;
		});
	}

	currentEstimationIndex(channel) {
		return this.currentEstimations.findIndex(function (estimate) {
			return estimate.channel === channel;
		});
	}

	async handleEstimate(ticket, channel) {
		let response = {
			response_type: 'in_channel'
		};
		// 1. if estimate: post message with ticket number + ticket description from JIRA + emoji reactions of SP options
		// this._getJiraTicket('ADVP-1000');
		if (this.currentEstimation(channel)) {
			response.text = `There is already an estimation in progress in this channel. Please /estimate close before creating a new one.`;
		} else {
			response.delayed = true;
			response.ticket = ticket;
			response.text = "Fetching data from Jira",
			response.channel_id = channel
		};

		return response;
	};

	async createBaseEstimate(ticket, channel) {
		let baseEstimate = {
			response_type: 'in_channel'
		};
		const jira = await this.jiraHelper.getTicket(ticket);
		const newEstimate = new Estimate(ticket, channel, jira);
		this.currentEstimations.push(newEstimate);
		let estimationActions = [];
		let options = this.storyPoints.storyPoints.map(point => {
			return {
				text: point.value,
				value: point.value
			}
		});
		estimationActions.push({
			name: "voting_options",
			text: "Select a story point",
			type: "select",
			options: options
		})
		estimationActions.push({
			"name": ticket,
			"text": "Close",
			"style": "danger",
			"type": "button",
			"value": "close",
			"confirm": {
				"title": "Are you sure?",
				"text": "Is everyone done voting?",
				"ok_text": "Yes",
				"dismiss_text": "No"
			}
		});
		if (jira) {
			baseEstimate.text = `Estimation in progress for: \`${ticket} - ${jira.summary}\`\n${jira.description}...`;
		} else {
			baseEstimate.text = `Estimation in progress for: \`${ticket}\``;
		}

		baseEstimate.attachments = [{
			"fallback": "You were unable to estimate",
			"callback_id": "estimation_vote",
			"color": "#3AA3E3",
			"attachment_type": "default",
			"actions": estimationActions
		}]
		
		return await this.slackHelper.postMessage(channel, baseEstimate.text, null, false, null, null, baseEstimate.attachments);
	}

	formatFinalEstimates(estimates) {
		let message = estimates.reduce(function (message, estimate) {
			let user = estimate.username;
			let sp = estimate.emoji;
			return `\n${message}\n${user} voted :${sp}:`;
		}, ':100:');

		return message;
	}

	async revealEstimates(channel) {
		try {
			const currentEstimate = this.currentEstimation(channel);
			const estimates = currentEstimate.estimates.sort(function (a, b) {
				return a.value - b.value;
			});
			if (estimates.length < 1) {
				this.currentEstimations.splice(this.currentEstimationIndex(channel), 1);
				return await this.slackHelper.postMessage(channel, `Estimation closed for \`${currentEstimate.ticket}\``);
			}
			const storyPoint = this.calculateStoryPoints(estimates);
			const newMessage = await this.slackHelper.postMessage(channel, `Revealing estimates for \`${currentEstimate.ticket}\`!`, null, false, null, `:sparkles:`);
			const allEstimates = this.formatFinalEstimates(estimates);

			await this.slackHelper.postMessage(channel, allEstimates, null, false, newMessage.ts, `:${storyPoint.emoji}:`);
			for (let estimate of estimates) {
				let user = await this.isAuthenticated(estimate.user_id);
				if (user) {
					await this.slackHelper.addReaction(user.token, estimate.emoji, newMessage);
				}
				// else {
				// 	await this.slackHelper.postMessage(channel, `${estimate.username} has not authenticated, but voted :${estimate.emoji}:`, estimate.username, false, newMessage.ts, `:${estimate.emoji}:`);
				// }
			}
			// await Promise.all(estimates.map(async value => {
			// 	let user = await this.isAuthenticated(value.user_id);
			// 	if (user) {
			// 		await this.slackHelper.addReaction(user.token, value.emoji, newMessage);
			// 	} 
			// 	else {
			// 		await this.slackHelper.postMessage(channel, `${value.username} has not authenticated, but voted :${value.emoji}:`, value.username, false, newMessage.ts, `:${value.emoji}:`);
			// 	}
			// }));

			await this.slackHelper.postMessage(channel, `The magically agreed upon story point for ticket \`${currentEstimate.ticket}\` is :${storyPoint.emoji}: :tada:`, null, false, null, `:${storyPoint.emoji}:`);
			// if(currentEstimate.jira && !currentEstimate.jira.story_point) {
			// 	await this.jiraHelper.updateTicket(currentEstimate.ticket, storyPoint.value);
			// }
			this.currentEstimations.splice(this.currentEstimationIndex(channel), 1);
		} catch (e) {
			console.log("Something went wrong when revealing estimates", e);
		}
	}

	calculateStoryPoints(points) {
		let initialFreq = {
			map: new Map(),
			max: {
				value: 0,
				emoji: 'zero'
			}
		};

		let freq = points.reduce(function (freq, current) {
			let currentMaxFreq = freq.map.get(freq.max);
			let currentVal = current.value;
			freq.map.set(currentVal, freq.map.get(currentVal) ? freq.map.get(currentVal) + 1 : 1);
			if (!currentMaxFreq || freq.map.get(currentVal) >= currentMaxFreq) {
				freq.max = current;
			}
			return freq;
		}, initialFreq);

		return freq.max;
	}

	async addEstimate(point, user_id, user_name, channel_id) {
		try {
			let addedEstimate = {};
			let currentEstimate = this.currentEstimation(channel_id);

			if (!currentEstimate) {
				return {
					'text': `There is no estimation currently in progress. Please /estimate *ticket_number* to create a new one.`,
					'response_type': 'ephemeral'
				};
			}

			let user = await this.isAuthenticated(user_id);
			let estimates = currentEstimate.estimates;
			let alreadyVoted = estimates.findIndex(function (estimate) {
				return estimate.user_id === user_id;
			});

			if (!user) {
				addedEstimate.text = `You voted :${point.emoji}: \nYou must authenticate before being able to estimate using reactions. To do so, please add this app to Slack via ${process.env.BASE_URL}/add.`;
			} else {
				addedEstimate.text = `You voted :${point.emoji}:`;
			}

			if (alreadyVoted > -1) {
				estimates[alreadyVoted].emoji = point.emoji;
				estimates[alreadyVoted].value = point.value;
			} else {
				estimates.push({
					emoji: point.emoji,
					user_id: user_id,
					username: user_name,
					value: point.value
				});

				currentEstimate.count++;
				// do in thread
				await this.slackHelper.postMessage(channel_id, `${user_name} has voted! We now have ${currentEstimate.count} total votes.`, user_name);
			}

			return addedEstimate;
		} catch (e) {
			console.log("what is going on in add estimate", e);
		}
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

	async execute(token, message, channel_id, user_id, user_name) {
		try {
			if (token !== this.token) {
				return {
					text: '',
					attachments: [{
						color: 'danger',
						text: `*Error*:\n Invalid Token`,
						mrkdwn_in: ['text'],
						response_type: 'ephemeral'
					}]
				};
			}

			const validPoint = this.storyPoints.isValidStoryPoint(message);
			const currentEstimate = this.currentEstimation(channel_id);

			if (!message || message === 'help') {
				return this.help(channel_id);
			} else if (validPoint) {
				return await this.addEstimate(validPoint, user_id, user_name, channel_id);
			} else if (currentEstimate) {
				if (message === 'close') {
					return {
						delayed: true,
						channel_id: channel_id,
						text: "Preparing to reveal final estimates... :robot_face:"
					};
				} else {
					let invalidEstimate = {};
					invalidEstimate.text = `${message} is not a valid story point. Please enter a valid fibonnaci number between 1 - 13`;
					invalidEstimate.response_type = 'ephemeral';
					return invalidEstimate;
				}
			} else {
				return this.handleEstimate(message, channel_id);
			}
		} catch (e) {
			console.log("execution error", e);
		}
	}
}

module.exports = Estimations;