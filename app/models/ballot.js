var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BallotSchema = new Schema({
	ballotList: [],
	updated: String
});

module.exports = mongoose.model('Ballot', BallotSchema);