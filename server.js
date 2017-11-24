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
let slack = new SlackHelper(process.env.SLACK_TOKEN);

app.post('/', async(req, res) => {
	try {
		if (req.body) {
			let plan = req.body;
			let result = await estimations.execute(plan.token, plan.text, plan.channel_id, plan.user_id, plan.user_name);
			return res.json(result);
		}
	} catch (e) {
		console.log("this plan failed", e);
	}
});

// This refactoring needs to be tested
app.post('/interact', async(req, res) => {
	try {
		if (req.body && req.body.payload) {
			let close = JSON.parse(req.body.payload);
			let result = await action.close(close.token, close.actions, close.channel.id);
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
			let data = {
				'user_id': auth.user_id,
				'token': auth.access_token
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