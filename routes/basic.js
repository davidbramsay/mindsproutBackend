var db   = require('../config/database')
, jwt    = require('jwt-simple')
, secret = require('../config/secret').secret;

//register route
exports.postRegister = function(req, res) {
  if (!req.body.name || !req.body.password) {
    res.json({success: false, msg: 'email and password required.'});
  } else {
    var newUser = new db.userModel({
      name: req.body.name,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
}

exports.postAuthenticate = function(req, res) {
  db.userModel.findOne({
    name: req.body.name
  }, function(err, user) {
    if (err) throw err;
 
    if (!user) {
      res.send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(user, secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
}
