require("dot").process({
	global: "_page.render",
	destination: __dirname + "/render/",
	path: (__dirname + "/views")
});

const Express = require('express');
const app = new Express();
const dotenv = require('dotenv');
dotenv.load();
const request = require('request')
const bodyParser = require('body-parser');
const mongo = require('mongodb');
const db = require('monk')(process.env.MONGODB_URI);
const Estimations = require('./src/estimations');
const Action = require('./src/action');
const SlackHelper = require('./src/slackHelper');
const render = require('./render');

app.use(function (req, res, next) {
	req.db = db;
	next();
});

app.use(bodyParser.urlencoded({
	extended: true
}));

let estimations = new Estimations(process.env.SLACK_TOKEN);
let action = new Action(process.env.SLACK_TOKEN, estimations);
let slack = new SlackHelper(process.env.SLACK_TOKEN, estimations);

app.post('/', async(req, res) => {
	try {
		if (req.body) {
			const plan = req.body;
			const result = await estimations.execute(plan.token, plan.text, plan.channel_id, plan.user_id, plan.user_name);
			if (result.delayed) {
				// Handle reveal taking longer than 3 sec
				return res.status(200).send(slack.delayedPost(plan.response_url, result.channel_id, result.ticket));
			} else {
				return res.json(result);
			}
		}
	} catch (e) {
		console.log("this plan failed", e);
	}
});

app.post('/interact', async(req, res) => {
	try {
		if (req.body && req.body.payload) {
			const payload = JSON.parse(req.body.payload);
			const token = payload.token;
			const username = payload.user.name;
			const userId = payload.user.id;
			const channelId = payload.channel.id;
			const callbackId = payload.callback_id;
			const userAction = payload.actions[0];
			let result;
			if (userAction.value === "close") {
				result = await action.close(token, channelId);
			}
			else {
				result = await action.vote(token, userAction, userId, username, channelId);
			}
			return res.json(result);
		}
	} catch (e) {
		console.log("interact failed", e);
	}
});

app.get('/authorize', async(req, res) => {
	try {
		if (req.query && req.query.code) {
			let auth = await slack.authorize(req.query.code);
			let db = req.db;
			let collection = db.get('planobot');
			let date = new Date();
			let data = {
				'user_id': auth.user_id,
				'token': auth.access_token,
				'team_name': auth.team_name,
				'team_id': auth.team_id,
				'timestamp': date.toISOString()
			};
			let update = await collection.update({
					'user_id': auth.user_id
				},
				data, {
					'upsert': true
				}, (err, doc) => {
					if (err) {
						res.send("There was a problem adding the information to the database.");
					} else {
						res.send("Success!")
					}
				});
		}
	} catch (e) {
		console.log("authorization went wrong", e);
	}
});

app.get('/add', (req, res) => {
	res.send(render.add_to_slack());
})

app.listen(process.env.PORT, () => {
	console.log(`Server started at localhost:${process.env.PORT}`);
})