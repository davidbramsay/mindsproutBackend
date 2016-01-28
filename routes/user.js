var jwt = require('jwt-simple');
var db    = require('../config/database');
var secret = require('../config/secret').secret;
var pythonClient = require('../pythonBinding');

//on startup test roundtrip ZMQ to make sure python client is up and running
pythonClient.testLink();


//REFACTOR as entry-point to other routes (db-specific or logic specific)
//including middleware

//Middleware //////////////////////////////////////////////////


//expose decoded userModel entry to further routes at req.user
exports.middleware = function(req, res, next){

 var token = getToken(req.headers);
 if (token) req.user = jwt.decode(token, secret);
 else {
     console.log('jwt middleware auth error');
     res.json({success: false, msg: 'unable to decode token'});
 }

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



//get booklist
exports.getBookList = function (req, res) {
    db.bookModel.find({}).lean().exec(function (err, doc){
        res.json(doc);
    });
}

//add book to booklist
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


//upload wav function
exports.postUpload = function (req, res) {

        req.files.forEach(function (file){
            console.log("LOG: user " + req.user._id + " uploaded " + file.path);
            var newRecording = new db.recordingModel({
                user_id: req.user._id,
                location: file.path,
                book_id: file.book_id
            });
            newRecording.save(function(err, recording) {
                if (err) console.log("ERROR: Couldn't save to recording database:" + err);

                //recording in database, now call processing on it
                pythonClient.processSilence('../' + file.path, function(metadata){
                    metadataToDb(metadata, "pauseDuration", req.user._id, recording);
                });
            });
        });

        res.status(204).end("File uploaded.");

}

//helper function
function metadataToDb(metadata, recommendationType, user_id, recording){
    db.recommendationTypeModel.findOne({recType: recommendationType}).lean().exec(function(err, rec){
        if (err) console.log("ERROR: Can't find recommendation type");

        metadata.forEach(function(entry){
            var newMetadata = new db.recordingMetadataModel({
                user_id: user_id,
                recording_id: recording._id,
                recommendationType_id: rec._id,
                dataLabel: entry.dataLabel,
                dataValue: entry.dataValue,
                dataUnits: entry.dataUnits
            });
            newMetadata.save(function(err){
                if (err) console.log("ERROR: can't save new metadata");
                else console.log("saved " + entry.dataLabel + " for " + recording.location);
            });
        });

    });
}




//route to get all available raw audio analysis information for user, organized by recording
exports.getMetadata = function(req, res){
    db.recordingMetadataModel.find({user_id: req.user._id}).lean().populate('recording_id', 'location uploadDate').populate('recommendationType_id', 'recType').exec(function (err, doc){
        res.json(reorderRecordingData(doc));
    });
}


function reorderRecordingData(doc){
    //takes raw recordingMetaData array and arranges by recording and then recType

    var result = {};
    doc.forEach(function(entry){

        if (typeof(result[entry.recording_id.location]) == 'undefined'){
            result[entry.recording_id.location] = {};
            result[entry.recording_id.location].uploadDate = entry.recording_id.uploadDate;
        }

        if (typeof(result[entry.recording_id.location][entry.recommendationType_id.recType]) == 'undefined'){
            result[entry.recording_id.location][entry.recommendationType_id.recType] = [];
        }

        var pushObj = {dataUnits: entry.dataUnits};
        pushObj[entry.dataLabel] = entry.dataValue;

        result[entry.recording_id.location][entry.recommendationType_id.recType].push(pushObj);

    });

    return result;
}



function reorderFullDataSet(doc){
    //takes raw recordingMetaData array and arranges by recording and then recType

    var result = {};
    doc.forEach(function(entry){

        if (typeof(result[entry.recommendationType_id.recType]) == 'undefined'){
            result[entry.recommendationType_id.recType] = {};
        }

        if (typeof(result[entry.recommendationType_id.recType][entry.dataLabel]) == 'undefined'){
            result[entry.recommendationType_id.recType][entry.dataLabel] = [];
        }

        result[entry.recommendationType_id.recType][entry.dataLabel].push(entry.dataValue);
    });

    for (var key in result){
        for (var dataLabel in result[key])
            result[key][dataLabel].sort(function(a,b){return a-b;});
        }

    return result;
}

//route to get all available audio analysis, by uploaded file, with recommendations
//with 'pendingUpdate' true if audio is still being processed
exports.getRecordingData = function(req, res){
  //helper function to give % for a value by pulling all metadata for a type
  //pull all metadata for req.user._id, organize by recording
  db.recordingMetadataModel.find({user_id: req.user._id}).lean().populate('recording_id', 'location uploadDate').populate('recommendationType_id', 'recType').exec(function (err, doc){
    db.recordingMetadataModel.find({}).lean().populate('recording_id', 'location uploadDate').populate('recommendationType_id', 'recType').exec(function (err, fullDataset){
        doc = checkPercentages(reorderRecordingData(doc), reorderFullDataSet(fullDataset));
        doc = pullCSV(doc);

        res.json(doc);

    });
  });
  //pull percentages, compare against csv database, pull relevant info from csv
  //
  //pull most recent recording, check if there is metadata for the recording or
  //if it is still being processed
}

function pullCSV(doc){
    //add csv relevant data from database
    for (var recording in doc){
        recording['pauseDuration'].forEach(function(element){
            if (typeof(element.avgSilencesPerMin) !== "undefined"){
                element.percentage
            }
        });
    }
}

function checkPercentages(doc, fullDataset){
    //add percentage to each data field in doc by comparing against fullDataset
    for (var recording in doc){
        for (var recType in doc[recording]){
            if (recType !== "uploadDate"){
                doc[recording][recType].forEach(function(dataObj,index){
                    for (var dataLabel in dataObj){
                        if (dataLabel !== "dataUnits"){
                            doc[recording][recType][index]['percentage'] = binaryIndexOf(fullDataset[recType][dataLabel], doc[recording][recType][index][dataLabel]) / fullDataset[recType][dataLabel].length;
                        }
                    }
                });
            }
        }
    }

    return doc;
}

function binaryIndexOf(array, searchElement) {

    var minIndex = 0;
    var maxIndex = array.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = array[currentIndex];

        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }

    return currentIndex;
}

//route to get only info on latest recording, false if no data is available for latest recording
exports.getLatestRecordingData = function(req, res){
    //pull most recent recording, check if there is metadata for the recording
    //or if it is still being processed. if still, return false
    //if not, helper function to pull percentages and compare against db, get
    //csv data, format
}

