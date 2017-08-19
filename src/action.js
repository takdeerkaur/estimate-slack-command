'use strict';

const Estimate = require('./estimate')

var Action = function Constructor(token) {
    this.token = token;
};

Action.prototype.execute = (body) => new Promise((resolve, reject) => {
  if (slackToken !== body.token) {
		return resolve({
			text: '',
			attachments: [createErrorAttachment(new Error('Invalid token'))]
		});
  }
  
  let action = body.actions[0].name;

  switch (action) {
    case 'cancel':
      response = {
        text: 'Keep on estimating!'
      }
      break;
    case 'confirm':
      Estimate.revealEstimates();
      response = {
        text: 'Estimation closed'
      }
      break;
    default:
      response = {
        text: 'Action invalid'
      }
  }

  resolve(response);

});

module.exports = Action;