var db = require('../config/database.js');
var csv = require('csv');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var papa = require('papaparse');
var filepath = './recommendations';
var files = fs.readdirSync(filepath);

//HELPER FUNCTIONS/////////////////////////////////////////////////////////////

function getKeyValueArray(data){
//return key-value array for each database entry from csv file

    //pull out keys from csv
    var keys = data[5];

    //step through all and push recs with key value pairs

    //initialize empty objects
    recs = [];
    for (var i = 0; i<data.length; i++)
        recs.push({});

    //step through each key
    var j = 1;
    while (keys[j] != ""){

        //step through each value and push it to the right object
        var i = 6;
        while (data[i][1]!= ""){
            recs[i-6][keys[j]] = data[i][j];
            i++;
        }
        j++;

    }

    //trim empty objects
    recs = recs.filter(function test(obj) { return (Object.keys(obj).length > 0); });

    return recs;

}


function reorgKeyValues(array) {
//step through each row (db entry) and reogranize appropriately:
//id field mapped to excelId
//all prefixed with 'in' except 'inAge' now pushed to 'inCriteria' array
//all prefixed with 'note' pushed to 'notes' array
//all left over pushed to 'outFields' array
//returns a similar array (each element is an object that should be pushed to
//the db, representing one row/piece of advice)

    //pull keys from schema
    expectedKeys = [];
    db.recommendationModel.schema.eachPath(function (path) {
        expectedKeys.push(path);
    });

    //step through each db entry
    array.forEach( function (entry, index, origArray){

        //see original entry
        //console.log(entry);

        //create inCriteria, outFields, and notes as empty arrays if they don't
        //exist in the entry
        if (!('inCriteria' in origArray[index]))
            origArray[index].inCriteria = {};
        if (!('outFields' in origArray[index]))
            origArray[index].outFields = {};
        if (!('notes' in origArray[index]))
            origArray[index].notes = {};

        //establish 'id' or 'excelid' (case insensitive) to keywords to map to 'excelId'
        validIdKeys = ['id', 'ID', 'Id', 'excelId', 'excelid', 'excelID', 'ExcelId', 'ExcelID'];
        var excelIdFound = false;

        for (var property in entry){ //step through properties

            /////////////////////////////////////
            //handle excelId
            if (_.contains(validIdKeys, property)) { //if one is a valid excelId key
                origArray[index]['excelId'] = entry[property]; //set 'excelId' to it

                //delete property if not named properly
                if (property != 'excelId')
                    delete origArray[index][property];

                //set found flag
                excelIdFound = true;

                continue; //terminate this loop iteration and jump to next
            }

            /////////////////////////////////////
            //push all prefixed with 'in' except 'inAge' to 'inCriteria'
            if (property.indexOf('in') == 0 && property != 'inAge' && property != 'inCriteria') {
                //if prefixed with in and not inAge

                origArray[index]['inCriteria'][property] = entry[property]; //push to inCriteria
                delete origArray[index][property]; //delete property
                continue;//continue
            }

            /////////////////////////////////////
            //push all prefixed with 'note' to 'notes'
            if (property.indexOf('note') == 0 && property != 'notes') {
                //if prefixed with note

                origArray[index]['notes'][property] = entry[property]; //push to notes
                delete origArray[index][property]; //delete property
                continue;//continue
            }

            /////////////////////////////////////
            //push all rest that don't match keys to 'outFields'
            // if you don't match the expected schema properties
            if (!(_.contains(expectedKeys, property))) {

                origArray[index]['outFields'][property] = entry[property]; //push to outField
                delete origArray[index][property]; //delete property
                continue;//continue
            }
        }

       //if excelId not found, warn.
       if (!excelIdFound) console.log('WARNING: No proper excelId was found in this entry');



    });

    return array;

}


function getRecTypeId(recType, templateObject, callback) {
//check recType in recommendationType database and return objectId if it
//exists, otherwise create it and return the objectId, put something in
//template for now

    db.recommendationTypeModel.findOne( {recType: recType},
        function(err, rec) {
            if (err) throw err;

            if (!rec){ //recType not found, create a new entry
                console.log(templateObject);
                templateFields = _.keys(templateObject);
                console.log('--');
                console.log(templateFields);
                var newRecType = new db.recommendationTypeModel({
                    recType: recType,
                    template: templateFields
                });
                newRecType.save(function(err){
                    if (err) throw err;

                console.log('reccomendation type not found, created with template: ' + templateFields);
                console.log('--- ' + recType + ' ----------------------------------');
                callback(newRecType._id);
                });
            } else { //recType found, return _id
                console.log('reccomendation type found');
                console.log('--- ' + recType + ' ----------------------------------');
                callback(rec._id);
            }
        });

}


function pushToRecommendationDb(elements, recTypeID) {
//upsert in recommendation database based on excelId, warn if overwriting and different
    elements.forEach(function(entry){

        entry.recommendationType_id = recTypeID;

        db.recommendationModel.findOneAndUpdate(
            { excelId: entry.excelId },
            { $set: entry },
            { upsert: true, new: false },
            function(err, affected){
                if (err) throw err;
                if (affected == null) {
                    console.log('new record ' + entry.excelId + ' written to database.');
                } else {
                    console.log('record ' + entry.excelId + ' found and updated.');
                }
            });
    });

}



function processFile(data) {
//parse a csv into json and push to db

    //parse csv string into array for each row in excel
    var output = papa.parse(data, {skipEmptyLines: true});
    //console.log(output.data);

    //pull out recType for the document from the header
    var todb = [];
    todb.recType = output.data[1][1];
    //console.log(todb.recType);

    //create array from rows, so each element is an object with key-value pairs
    //from excel (aka id: pauseDuration0001, inAge: "10+:15", etc)
    todb.recs = getKeyValueArray(output.data);
    //console.log(todb.recs);

    //reorganize to match mongoose schema (everything with 'in' prefix is put
    //in an array of 'inCriteria' except 'inAge', 'id' is converted to
    //'excelId', prefixed with 'note' are put in 'notes' array, etc to match
    //mongoose groupings/schema).
    todb.recs = reorgKeyValues(todb.recs);
    //check recType against recommendationType DB and add it if it doesn't
    //exist. Return the objectId so we can link to it from our recommendation DB
    getRecTypeId(todb.recType, todb.recs[0].outFields, function(recTypeID){

       //push each to the database, upsert and warn if overwriting in recommendation DB
       pushToRecommendationDb(todb.recs, recTypeID);
    });
}



//BEGIN MAIN//////////////////////////////////////////////////////////////



exports.update = function() {
//pull all .csv files from the recommendations folder
for(var i in files) {
   if(path.extname(files[i]) === ".csv") {
   //interate through csv files

     fs.readFile(filepath + '/' + files[i], "utf-8", function read(err, data) {
         if (err) {
             throw err;
         }
         //step through and process each file
         console.log('processing file : ' + filepath + '/' + files[i] + ' ...');
         processFile(data);
     });

   }
}

}

