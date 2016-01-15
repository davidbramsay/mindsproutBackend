var jwt = require('jwt-simple');
var db    = require('../config/database');
var secret = require('../config/secret').secret;


//REFACTOR as entry-point to other routes (db-specific or logic specific)
//including middleware

//Middleware //////////////////////////////////////////////////


//expose decoded userModel entry to further routes at req.user
exports.middleware = function(req, res, next){

 var token = getToken(req.headers);
 if (token) req.user = jwt.decode(token, secret);
 else res.json({success: false, msg: 'unable to decode token'})

 //should be unnecessary, double checking- after token verification against db
 //for full entry- that we can again find an entry that matches the decoded email
 db.userModel.findOne({email: req.user.email}, function (err, user) {
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


//user routes///////////////////



//booklist
exports.getBookList = function (req, res) {
    db.bookModel.find({}).lean().exec(function (err, doc){
        res.json(doc);
    });
}

exports.postBookList = function (req, res) {
  if (!req.body.title) {
    res.json({success: false, msg: 'book title required.'});
  } else {
    var newBook = new db.bookModel({
      title: req.body.title,
      author: req.body.author,
      amazonUrl: req.body.amazonUrl
    });
    // save the book
    newBook.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'book already exists.'});
      }
      res.json({success: true, msg: 'Successful added new book.'});
    });
  }
}
