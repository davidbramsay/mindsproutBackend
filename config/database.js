var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;

//REFACTOR as entrypoint, give each db schema a file and simply initialize DB
//and pass through each model with this file


//db setup/////////////////////////////////////////////

var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/mindsprout-dev';

var mongoOptions = { db: { safe: true }};

mongoose.connect(uristring, mongoOptions, function (err, res) {
  if (err) { console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else { console.log ('Successfully connected to: ' + uristring); }
});


//db schemas//////////////////////////////////////////

var userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    admin: { type: Boolean, required: true, default: false },
    firstName: { type: String },
    lastName: { type: String },
    occupation: { type: String },
    numChildren: { type: Number },
    childDOB: { type: Date },
    childSex: { type: String },
    phone: { type: String },
    zip: { type: Number },
    mailingList: { type: Boolean },
    imgUrl: { type: String },
    createDate: { type : Date, required: true, default: Date.now },
    lastPasswordUpdate: { type: Date, required: true, default: Date.now },
    removeDate: { type: Date }
});

var bookSchema = new Schema({
    title: { type: String, required: true, unique: true },
    author: { type: String },
    amazonUrl: { type: String },
    added: { type: Date, default: Date.now }
});

var recommendationTypeSchema = new Schema({
    recType: { type: String, required: true, unique: true },
    Description: { type: String },
    template: {}
});

var recommendationSchema = new Schema({
    excelId: { type: String, required: true, unique: true },
    recommendationType_id: { type: Schema.Types.ObjectId, ref: 'RecommendationType', required: true },
    recTitle: { type: String },
    weeklyWin: { type: Number },
    inAge: { type: String },
    inCriteria: {},
    outFields: {},
    notes: {},
    deprecated: { type: Boolean, default: false }
});

var recordingSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadDate: { type: Date, required: true, default: Date.now },
    location: { type: String },
    book_id: { type: Schema.Types.ObjectId, ref: 'Book' },
    removeDate: { type: Date }
});

var recordingMetadataSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recording_id: { type: Schema.Types.ObjectId, ref: 'Recording', required: true },
    recommendationType_id: { type: Schema.Types.ObjectId, ref: 'RecommendationType', required: true },
    createDate: {type: Date, required: true, default: Date.now },
    updateDates: [{type: Date}],
    dataLabel: { type: String, required: true },
    dataValue: { type: Number, required: true },
    dataUnits: { type: String, required: true },
    dataConfidence: { type: Number },
    dataExtra: {}
});

var recommendationHistorySchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shownDate: { type: Date, required: true, default: Date.now },
    recording_id: { type: Schema.Types.ObjectId, ref: 'Recording' },
    recommendation_ids: [{ type: Schema.Types.ObjectId, ref: 'Recommendation' }],
    recordingMetadata_ids: [{ type: Schema.Types.ObjectId, ref: 'RecordingMetadata' }]
});

var engagementSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String },
    url: { type: String, required: true },
    action: { type: String },
    postData: {}
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
exports.bookModel = mongoose.model('Book', bookSchema);
exports.recommendationTypeModel = mongoose.model('RecommendationType', recommendationTypeSchema);
exports.recommendationModel = mongoose.model('Recommendation', recommendationSchema);
exports.recordingModel = mongoose.model('Recording', recordingSchema);
exports.recordingMetadataModel = mongoose.model('RecordingMetadata', recordingMetadataSchema);
exports.recommendationHistoryModel = mongoose.model('RecommendationHistory', recommendationHistorySchema);
exports.engagementModel = mongoose.model('Engagement', engagementSchema);
