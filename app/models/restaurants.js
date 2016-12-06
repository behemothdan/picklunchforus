var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RestaurantsSchema = new Schema({
    name: String,
	rid: String
});

module.exports = mongoose.model('Restaurants', RestaurantsSchema);