var db   = require('../config/database')
, jwt    = require('jwt-simple')
, getIP  = require('ipware')().get_ip
, secret = require('../config/secret').secret;


exports.engagementMiddleware = function(req, res, next){

    if (typeof(req.user) == 'undefined') req.user = {};

    var postData = {};
    var ip = getIP(req).clientIp;
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    if (req.method=="POST") postData = req.body;

    var newEngagement = new db.engagementModel({
      user_id: req.user._id,
      ipAddress: ip,
      url: fullUrl,
      action: req.method,
      postData: postData
    });
    //log the engagement
    newEngagement.save(function(err) {
      if (err) {
          console.log('ERROR: engagement middleware db write failed');
          next();
      }
      console.log('LOG: user ' + req.user._id +' from ipAddress: ' + ip + ': ' + req.method + ' ' + fullUrl);
      next();
    });

}






exports.postRegister = function(req, res) {
  if (!req.body.email || !req.body.password) {
    res.json({success: false, msg: 'email and password required.'});
  } else {
    var newUser = new db.userModel({
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      occupation: req.body.occupation,
      numChildren: req.body.numChildren,
      childDOB: req.body.childDOB,
      childSex: req.body.childSex,
      phone: req.body.phone,
      zip: req.body.zip,
      mailingList: req.body.mailingList,
      imgUrl: req.body.imgUrl,
      admin: false
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Email already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
}

exports.postAuthenticate = function(req, res) {
  db.userModel.findOne({
    email: req.body.email
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
