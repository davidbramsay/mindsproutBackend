var jwt = require('jwt-simple');
var db    = require('../config/database');
var secret = require('../config/secret').secret;

//expose decoded userModel entry to further routes at req.user
exports.middleware = function(req, res, next){

 var token = getToken(req.headers);
 if (token) req.user = jwt.decode(token, secret);
 else res.json({success: false, msg: 'unable to decode token'})

 //should be unnecessary, double checking- after token verification against db
 //for full entry- that we can again find an entry that matches the decoded name
 db.userModel.findOne({name: req.user.name}, function (err, user) {
    if( err || !user ) {
        console.log('something has gone horribly wrong. Token good, no user in db or access to db.');
        return res.status(403).send({success: false, msg: 'unable to find user in db'});
    }
 });
 //end unnecessary bit
 
 next();
}



//helper function
getToken = function (headers) {
  if (headers && headers.authorization) {

    var parted = headers.authorization.split(' ');
    if (parted.length === 2) return parted[1];
    else return null;

  } else { return null; }
};
