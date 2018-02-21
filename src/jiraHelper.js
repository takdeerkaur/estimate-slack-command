var fetch = require('node-fetch');
var qs = require('qs');

class JiraHelper {
  constructor() {
    // this.token = token
  }

  getTicket(ticket) {
    return new Promise((resolve, reject) => {
      fetch(`https://jira.move.com/rest/api/2/issue/${ticket}`, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${process.env.JIRA_AUTH}`,
            "Content-Type": "application/json"
          }
        })
        .then((resp) => resp.json())
        .then(function (data) {
          if (data.fields && data.fields.summary) {
            const jira_data = {
              summary: data.fields.summary,
              description: data.fields.description ? data.fields.description.trim().split(/\s+/).slice(0, 30).join(" ") : "",
              story_point: data.fields.customfield_10002
            };
            console.log("This is the jira data", jira_data);
            resolve(jira_data);
          }
          resolve(null);
        }, function (error) {
          resolve(error);
        });
    });
  }

  // updateTicket(ticket, value) {
  //   return new Promise((resolve, reject) => {
  //     fetch(`https://jira.move.com/rest/api/2/issue/${ticket}`, {
  //           method: "PUT",
  //           headers: {
  //               "Authorization": `Basic ${process.env.JIRA_AUTH}`,
  //             "Content-Type": "application/json"
  //           },
  //           data: {
  //             "fields": {
  //               "customfield_10002": value
  //             }
  //           }
  //         })
  //       .then((resp) => resp.json())
  //       .then(function (data) {
  //         console.log(JSON.stringify(data));
  //         resolve(data);
  //       }, function (error) {
  //         resolve(error);
  //       });
  //   });
  // }
}

module.exports = JiraHelper;