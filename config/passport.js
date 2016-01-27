var JwtStrategy = require('passport-jwt').Strategy;

// load up the user model
var db = require('../config/database'); // get db config file
var secret = require('../config/secret').secret;

module.exports = function(passport) {
  var opts = {};
  opts.secretOrKey = secret;
  passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    db.userModel.findOne({id: jwt_payload.id}, function(err, user) {
        if (err) {
            console.log('passport auth error');
            return done(err, false);
          }
          if (user) {
            done(null, user);
          } else {
            console.log('passport auth error');
            done(null, false);
          }
      });
  }));
};
