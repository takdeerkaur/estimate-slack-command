class Estimate {
    constructor(ticket, channel, jira) {
      this.ticket = ticket,
      this.channel = channel,
      this.estimates = [],
      this.count = 0,
      this.jira = jira
    }
  }
  
  module.exports = Estimate;