var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Votes', new Schema({ 
    userid: String, 
    voteid: String    
}));