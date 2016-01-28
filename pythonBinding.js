var zerorpc = require("zerorpc");
//provides a link to python from our node server:
//this bridge over ZMQ is used to tell python when a new audio file is
// ready to be processed (functions in pythonAudioProcessing), and calls
// the functions, and receives metadata when the processing is completed

var PythonClient = new function(){
//create singleton python client

    //timeout vs heartbeat (two missed heartbeats = timeout), both set @ 60sec
    this.client = new zerorpc.Client({timeout: 60, heartbeatInterval: 30000});
    this.client.connect("tcp://127.0.0.1:4242");

    this.testLink = function(cb){
    //verify link is ok by roundtriping 'testing string' through python
        this.client.invoke("verifyLink", "passed!", function(err, reply, streaming) {
            if(err) { console.log("ERROR: ", err); }

            if (cb && typeof cb == "function") cb(reply);//callback once completed, if exists
            else console.log(reply);//else print success
        });
    }

    this.testTimeout = function(cb){
    //check timeout - there will be no response to this request
        this.client.invoke("testTimeout", function(err, reply, streaming) {
            if(err) { console.log("ERROR: ", err); }
            console.log(reply);
        });
    }

    this.processSilence = function(path, cb){
    //process silence on audiofile at 'path', return metadata to callback
        this.client.invoke("processSilence", path, function(err, reply, streaming) {
            if(err) { console.log("ERROR: ", err); }

            if (cb && typeof cb == "function") cb(reply);//callback once completed, if exists
            else console.log(reply);//else print reply
        });
    };

}

module.exports = PythonClient;
