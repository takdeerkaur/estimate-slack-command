const mongo = require('mongodb');
const db = require('monk')(process.env.MONGODB_URI);