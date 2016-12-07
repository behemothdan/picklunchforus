// Initial Setup
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var moment = require('moment');
var config = require('./config');

// Import models
var Restaurants = require('./app/models/restaurants');
var Ballot = require('./app/models/ballot');
var User = require('./app/models/users');
var Votes = require('./app/models/votes');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 11667;
mongoose.Promise = global.Promise;
mongoose.connect(config.database);
app.set('secretPhrase', config.secret);
app.set('db', config.database);

var db = app.get('db');

// Routes
var router = express.Router();

router.use(function(req, res, next) {        
    next();
});

// User Authentication
router.post('/login', function(req, res) {
	User.findOne({
		name: req.body.name
	}, function(err, user) {
		if (err) {
			throw err;
		}

		if (!user) {
			res.json({ success: false, message: 'Login failed. No user found with that name.' });
		} else if (user) {
			var hashedPasswordFromUser = require('crypto').createHash('md5').update(req.body.password).digest("hex");
			
			if (user.password != hashedPasswordFromUser) {
				res.json({ success: false, message: 'Login failed. Password is incorrect.' });
			} else {
				var token = jwt.sign(user, app.get('secretPhrase'), {
				expiresIn: 60*60*24
			});
			
			res.json({
				success: true,
				message: 'Login successful',
				token: token,
				user: {
					name: user.name,
					id: user._id
				}
			});
		}
	}
	});
});

router.get('/', function(req, res) {
    res.json({ message: 'Welcome to picklunchfor.us' });   
});

// Generate the ballot once a day
router.route('/ballot')	
	.put(function(req, res) {
		// We are storing the current days ballot in the same location
		Ballot.findById('58468be737b32b67bd659878', function(err, ballot) {
			Restaurants.find(function(err, restaurants) {
				if(err) {
					res.send(err);
				}														
				
				// Check to see if the ballot has been updated for today
				// If not, generate a new ballot and update the date
				if(ballot.updated != moment().format('MMM Do YYYY')){
					var shuffled = restaurants.sort(function() {
						return .5 - Math.random()
					});
					
					ballot.ballotList = shuffled.slice(0,5);							
					ballot.updated = moment().format('MMM Do YYYY');		
				}
				
				// If the above if statement didn't run, it will return the same ballot list in the database
				ballot.save(function(err) {
					if(err) {
						res.send(err);
					}
					
					// Shuffle the list even though we are using the same one
					var shuffled = ballot.ballotList.sort(function() {
						return .5 - Math.random()
					})
					res.json(shuffled);
				});
			});							
		});
	});	

router.route('/users')
	// Add new user
	.post(function(req,res) {
		var user = new User();
		var hashedPassword = require('crypto').createHash('md5').update(req.body.password).digest("hex");
		
		user.name = req.body.name;	
		user.password = hashedPassword;
		user.admin = req.body.admin;
		user.currentVote = "";
		
		user.save(function(err) {
			if(err) {
				res.send(err);
			}
			res.json({ message: 'User created!' });
		});
	})
	
	// Return all users
	.get(function(req, res){
		User.find(function(err, user) {
			if(err) {
				res.send(err);
			}
			res.json(user);
		});
	});
	

router.route('/restaurants')
	// Add a new restaurant
	.post(function(req, res) {
		var restaurants = new Restaurants();
		restaurants.name = req.body.name;
		restaurants.rid = req.body.rid;
		
		restaurants.save(function(err) {
			if(err) {
				res.send(err);
			}
			res.json({ message: 'Restaurant created.' });
		});	
	})
	
	// Return all restaurants
	.get(function(req, res){
		Restaurants.find(function(err, restaurants) {
			if(err){
				res.send(err);
			}
			res.json(restaurants);
		});
	});

// Get the restaurant information based off the ID (rid in the database)
router.route('/restaurants/:id')
	// Return single restaurant information
	.get(function(req, res) {		
		Restaurants.findOne({rid: req.params.id}, function(err, restaurants){
			if(err){
				res.send(err);
			}						
			res.json(restaurants);
		});
	})
	
	// Update a restaurant
	.put(function(req, res){
		Restaurants.findOne({rid: req.params.id}, function(err, restaurants) {
			if(err){
				res.send(err);
			}
			restaurants.name = req.body.name;
			restaurants.rid = req.params.id;
			
			restaurants.save(function(err){
				if(err){
					res.send(err);
				}
				res.json({message: 'Restaurant successfully updated.' });
			});
		});
	})
	
	// Remove a restaurant
  .delete(function(req, res) {		
        Restaurants.remove({rid: req.params.rid}, function(err, restaurants) {
            if (err) {
                res.send(err);
			}			
            res.json({ message: 'Successfully deleted' });
        });
    });
	
// API tomorrow testing
router.route('/tomorrow')
	.get(function(req, res) {
		Restaurants.find(function(err, restaurants) {
			if(err) {
				res.send(err);
			}								
			var shuffled = restaurants.sort(function() {
				return .5 - Math.random()
			});
			selected = shuffled.slice(0,5);			
		});
	});
	
router.route('/vote/results')
	.get(function(req,res) {
		User.find(function(err, user.currentVote) {
			if(err) {
				res.send(err);
			}								
			res.json(user);
		});
	});
	
// Validate the user has logged in. It sets a token after authenticating.
// You can append the token with ?token={massivestring} if you want to
// I currently moved this to only authenticate for actual voting to make the other calls easier to test
router.use(function(req, res, next) {
	var token = req.body.token || req.query.token || req.headers['x-access-token'];
	if (token) {
		jwt.verify(token, app.get('secretPhrase'), function(err, decoded) {
			if (err) {
				return res.json({ success: false, message: 'Token was invalid' });
			} else {
				req.decoded = decoded;
				currentUserId = req.decoded._doc._id;				
				next();
			}
		});
	} else {
		return res.status(403).send({
			success: false,
			message: 'You have not logged in yet.'
		});
	}
});
	
// Pass in voting information
router.route('/vote/:id')
	.put(function(req, res) {
		var id = mongoose.Types.ObjectId(currentUserId);
		User.findById(id, function(err, user) {
			if(err){
				res.send(err);
			}
			user.currentVote = req.params.id;
			
			// For now, hard code the closing time
			var endTime = '11:45 AM';
			// Offset the generated time to make this Mountain.
			// Ideally we would do this with a little more flexibility.
			var currentTime = moment().utcOffset(-420).format("HH:mm A");			
			
			if(currentTime < endTime) {
				user.save(function(err){
					if(err){
						res.send(err);
					}
					res.json({ message: 'Vote successfully updated.' });
				});					
			} else {
				return res.status(409).send({
					success: false,
					message: 'Voting time for today is over! Try again tomorrow.'
				});
			}
		});
	});
	
// Preface all 'router' calls with /api
app.use('/api', router);	

// Start server
app.listen(port);
console.log('Service is listening on ' + port);