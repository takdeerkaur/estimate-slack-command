const Estimate = require('./estimate');

class Action {
  constructor(token, estimate) {
    this.token = token;
    this.estimate = estimate;
  }

  execute(body) {
    return new Promise((resolve, reject) => {
      if (body.token !== this.token) {
        resolve({
          text: 'This token invalid bruh'
        });
      }

      let action = body.actions[0].name;
      let response = {};

      switch (action) {
        case 'cancel':
          response = {
            text: 'Keep on estimating!'
          }
          break;
        case 'confirm':
          this.estimate.revealEstimates(body);
          response = {
            text: 'Estimation closed'
          }
          break;
        default:
          response = {
            text: 'Action invalid'
          }
      }

      console.log("action response", response);

      resolve(response);

    });
  }
}

module.exports = Action;