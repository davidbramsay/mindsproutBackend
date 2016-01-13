var express     = require('express')
, app           = express()
, bodyParser    = require('body-parser')
, morgan        = require('morgan')
, mongoose      = require('mongoose')
, passport      = require('passport')
, db            = require('./config/database') 
, secret        = require('./config/secret').secret
, user_routes   = require('./routes/user')
, basic_routes  = require('./routes/basic')
, jwt           = require('jwt-simple');

port = process.env.PORT || 8000;

// get our request parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// log to console
app.use(morgan('dev'));

// Use the passport package in our application
app.use(passport.initialize());

// check the API is up and running!
app.get('/', function(req, res) {
  res.send('Hello! The mindsprout api is up and running!');
});

// pass passport for configuration
require('./config/passport')(passport);


/*
//double check we have an ssl connection
function ensureSec(req, res, next) {
    if (req.headers['x-forwarded-proto'] == 'https') {
        return next();
    } else {
        console.log('NOT SSL PROTECTED! rejected connection.');
        res.redirect('https://' + req.headers.host + req.path);
    }
}

app.use(ensureSec);
*/


// bundle our routes
var userRoutes = express.Router();
app.use('/user', userRoutes);

//authenticate all user routes with passport middleware, decode JWT to see
//which user it is and pass it to following routes as req.user
userRoutes.use('/*', passport.authenticate('jwt', {session:false}), user_routes.middleware);


//////////////////////////////generic routes (SSL but no token/verified user)

//landing page - authenticate (user home if authenticated, redirect to login)
app.post('/authenticate', basic_routes.postAuthenticate);

//register post
app.post('/register', basic_routes.postRegister);


///////////////////////////user routes (SSL and verified user, processed data)

//book list

/////////////////////////test user routes (return direct from DB for user)




userRoutes.get('/test', function(req,res){
    console.log(req.user.name);
    res.json({here: 'you made it'});
});






// Start the server
app.listen(port);
console.log('Shaping young minds on port: ' + port);
