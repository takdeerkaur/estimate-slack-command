'use strict';

const Express = require('express');
const bodyParser = require('body-parser');
const Estimate = require('./src/estimate');
const Action = require('./src/action');

const app = new Express();
app.use(bodyParser.urlencoded({
	extended: true
}));

const {
	SLACK_TOKEN: slackToken,
	PORT
} = process.env;

if (!slackToken) {
	console.error('missing environment variable SLACK_TOKEN');
	process.exit(1);
}

const port = PORT || 80;

let action = new Action(slackToken);
let estimate = new Estimate(slackToken);
console.log("what is estimate", estimate);

app.post('/', (req, res) => {
	if (req.body) {
		if (req.body.payload) {
			action.execute(req.body.payload)
				.then((result) => {
					console.log("this is the action", result);
					return res.json(result);
				})
				.catch(console.error);
		}
		else {
			estimate.execute(req.body)
				.then((result) => {
					console.log("this is the result", result);
					return res.json(result);
				})
				.catch(console.error);
		}
	}
});

app.listen(port, () => {
	console.log(`Server started at localhost:${port}`);
})