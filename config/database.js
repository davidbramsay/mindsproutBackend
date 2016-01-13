var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;

//db setup/////////////////////////////////////////////

var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/mindsprout-dev';

var mongoOptions = { db: { safe: true }};

mongoose.connect(uristring, mongoOptions, function (err, res) {
  if (err) { console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else { console.log ('Successfully connected to: ' + uristring); }
});


//db schemas//////////////////////////////////////////

var userSchema = new Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});




//db middleware////////////////////////////////////////////////

userSchema.pre('save', function (next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

//password verification
userSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

//exports///////////////////////////////////////////////////////

exports.userModel = mongoose.model('User', userSchema);

