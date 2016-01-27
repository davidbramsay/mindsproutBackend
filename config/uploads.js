var moment = require('moment');
var multer = require('multer');
var jwt = require('jwt-simple');
var fs = require('fs');

var uploadFile = multer({dest: "audioUploads/"}).any();

function ensureExists(path, cb) {
    fs.mkdir(path, function(err) {
        if (err) {
            if (err.code == 'EEXIST') cb(null, path); // ignore the error if the folder already exists
            else {
               console.log('error creating file for upload');
               cb(err, path); // something else went wrong
            }
        } else cb(null, path); // successfully created folder
    });
}



var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureExists('./audioUploads/' + req.user._id, cb);
    },
    filename: function (req, file, cb) {
        cb(null, req.user._id + '_' + moment().format('MMDDYY[_]HHmm') + '.wav')
    }
});

exports.uploads = multer({storage:storage}).any();


