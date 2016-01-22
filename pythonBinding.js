var zerorpc = require("zerorpc");

//timeout vs heartbeat (two missed heartbeats = timeout), both set @ 60sec
var client = new zerorpc.Client({timeout: 60, heartbeatInterval: 30000});
client.connect("tcp://127.0.0.1:4242");

client.invoke("verifyLink", "testing string", function(err, reply, streaming) {
    if(err) { console.log("ERROR: ", err); }
    console.log(reply);
});

/*
client.invoke("testTimeout", function(err, reply, streaming) {
    if(err) { console.log("ERROR: ", err); }
    console.log(reply);
});
*/

client.invoke("processSilence", "id", "../audioUploads/emily.wav", function(err, reply, streaming) {
    if(err) { console.log("ERROR: ", err); }
    console.log(reply);
});
