class Action {
  constructor(token, estimate) {
    this.token = token;
    this.estimate = estimate;
  }

  async close(token, channel_id) {
    if (token !== this.token) {
      return {
        text: 'This token invalid bruh'
      };
    }
    try {
      await this.estimate.revealEstimates(channel_id);
      return;
    } catch (err) {
      return {
        text: "Something went horribly wrong"
      }
    }
  }

  async vote(token, action, user_id, user_name, channel_id) {
    if (token !== this.token) {
      return {
        text: 'This token invalid bruh'
      };
    }

    const selected = action.selected_options[0].value;
    let response = {};

    try {
			const validPoint = this.estimate.storyPoints.isValidStoryPoint(selected);
			const currentEstimate = this.estimate.currentEstimation(channel_id);
      
      if (validPoint) {
				return await this.estimate.addEstimate(validPoint, user_id, user_name, channel_id);
      } 
      else {
					let invalidEstimate = {};
					invalidEstimate.text = `${selected} is not a valid story point. Please enter a valid fibonnaci number between 1 - 13`;
					invalidEstimate.response_type = 'ephemeral';
					return invalidEstimate;
			}
		} catch (e) {
			console.log("execution error", e);
		}

    return response;
  }
}

module.exports = Action;