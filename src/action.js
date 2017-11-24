const Estimate = require('./estimate');

class Action {
  constructor(token, estimate) {
    this.token = token;
    this.estimate = estimate;
  }

  async close(token, actions, channel_id) {
      if (token !== this.token) {
        return {
          text: 'This token invalid bruh'
        };
      }

      let action = actions[0].name;
      let response = {};

      switch (action) {
        case 'cancel':
          response = {
            text: 'Keep on estimating!'
          }
          break;
        case 'confirm':
          await this.estimate.revealEstimates(channel_id);
          response = {
            text: 'Estimation closed'
          }
          break;
        default:
          response = {
            text: 'Action invalid'
          }
      }

      return response;
  }
}

module.exports = Action;