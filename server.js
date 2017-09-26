const Express = require('express');
const request = require('request')
const bodyParser = require('body-parser');
const Estimate = require('./src/estimate');
const Action = require('./src/action');
const SlackHelper = require('./src/slackHelper');

const app = new Express();
app.use(bodyParser.urlencoded({
	extended: true
}));

const dotenv = require('dotenv');
dotenv.load();

const {
	SLACK_TOKEN: slackToken,
	PORT
} = process.env;

if (!slackToken) {
	console.error('missing environment variable SLACK_TOKEN');
	process.exit(1);
}

const port = PORT || 80;

let estimate = new Estimate(slackToken);
let action = new Action(slackToken, estimate);
let slack = new SlackHelper(slackToken);

app.post('/', (req, res) => {
	if (req.body) {
		estimate.execute(req.body)
			.then((result) => {
				return res.json(result);
			})
			.catch(console.error);
	}
});

app.post('/interact', (req, res) => {
	if (req.body && req.body.payload) {
		action.close(JSON.parse(req.body.payload))
			.then((result) => {
				return res.json(result);
			})
			.catch(console.error);

	}
});

app.get('/authorize', (req, res) => {
	if (req.query && req.query.code) {
		slack.authorize(req.query.code)
			.then((result) => {
				estimate.users.push({
					user_id: result.user_id,
					token: result.access_token
				});
				res.send("Success!")
			})
			.catch(console.error);

	}
});

app.get('/add', (req, res) =>{
    res.sendFile(__dirname + '/add_to_slack.html')
})

app.listen(port, () => {
	console.log(`Server started at localhost:${port}`);
})