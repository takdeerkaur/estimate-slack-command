require("dot").process({
	global: "_page.render", 
	destination: __dirname + "/render/", 
	path: (__dirname + "/views")
});

const Express = require('express');
const app = new Express();
const request = require('request')
const bodyParser = require('body-parser');
const Estimate = require('./src/estimate');
const Action = require('./src/action');
const SlackHelper = require('./src/slackHelper');
const dotenv = require('dotenv');
const render = require('./render');

dotenv.load();

app.use(bodyParser.urlencoded({
	extended: true
}));

let estimate = new Estimate(process.env.SLACK_TOKEN);
let action = new Action(process.env.SLACK_TOKEN, estimate);
let slack = new SlackHelper(process.env.SLACK_TOKEN);

app.post('/', (req, res) => {
	if (req.body) {
		estimate.execute(req.body)
			.then((result) => {
				console.log("this is response from execute", result);
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

app.get('/add', (req, res) => {
	res.send(render.add_to_slack());
})

app.listen(process.env.PORT, () => {
	console.log(`Server started at localhost:${process.env.PORT}`);
})