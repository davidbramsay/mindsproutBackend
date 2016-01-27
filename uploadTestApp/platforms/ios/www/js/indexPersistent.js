//globals
var $notifyDiv;
var recording = false;
var playing;
var email = '';
var record = null;
audioFile = 'record.wav';
dir = 'cdvfile://localhost/persistent/'
fileURL = 'cdvfile://localhost/persistent/record.wav';
emailFileURL = 'cdvfile://localhost/persistent/email.txt';

//add eventlistener to call 'init' when device has loaded
document.addEventListener("deviceready", init, false);

//===========================HELPER FUNCTIONS==============================
function gotFS(fileSystem) {
    fileSystem.root.getFile(audioFile, {create: true, exclusive: false}, gotFileEntry, fail);
}

function gotFileEntry(fileEntry){
//    fileURL=fileEntry.toURL();
//    nativeURL = fileEntry.toNativeURL();
}

function fail(e) {
    navigator.notification.alert("Oops, can't open the filesystem!  Contact help@mindsprout.co", null, 'MindSprout Error', "OK");
}

function validateEmail(emailField){
    var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;

    if (reg.test(emailField) == false) {
            navigator.notification.alert("Oops, it looks like that's not a valid email address!", null, 'MindSprout Error', "OK");
            return false;
    }
    return true;
}



//===========================ON STARTUP FUNCTION==============================
function init() {
	
    $notifyDiv = $("#notifications");

    $("#mainlogo").fadeIn(1000);
    $("#instructions").fadeIn(1000);

    newHtml = "<p>INIT</p>";
    $notifyDiv.append(newHtml);


    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);//160000000 bytes (160mB for 16 bit, 44100, 2 channel, 15 min .wav)
    //need to check for existing file/email, and go to appropriate page of app
    //window.resolveLocalFileSystemURL
    window.resolveLocalFileSystemURL(emailFileURL, function(fileEntry){},null);//email file resolves
    window.resolveLocalFileSystemURL(fileURL,function(fileEntry){},null);//audio file resolves


	$("#recordStop").on("touchend", recordAudio);
	$("#upload").on("touchend", uploadAudio);
	$("#playBack").on("touchend", playAudio);
	$("#reRecord").on("touchend", reRecord);
	$("#emailSubmit").on("touchend", emailSubmit);
}



//===========================ONCLICK FUNCTIONS==============================
function recordAudio() {

    if (!recording){
        record = new Media(audioFile,
            function () {$("#playBack").text("listen back");}, //success
            function(e) {
                navigator.notification.alert("Oops, can't open the recorder!  Contact help@mindsprout.co", null, 'MindSprout Error', "OK");
            });//error

        $("#status").css("visibility","visible");
        $("#recordStop").text("Stop");
        record.startRecord();
        recording = true;
    }else {
        $("#status").css("visibility","hidden");
        $("#page2").attr("hidden", "true");
        $("#page3").removeAttr("hidden");
        $("#recordStop").text("Record");
        record.stopRecord();
        recording = false;
    }
}


function emailSubmit(){
    //check email, give error if incorrect.  If correct, save email and load
    //next page
    email = $('#email').val();
    if (validateEmail(email)) {
        //save email to file???
        $("email").attr("disabled", "true");
        $("#page1").attr("hidden", "true");
        $("#page2").removeAttr("hidden");
    }
}

function playAudio(){
   //play back button pressed.  change play button to stop, play audio back. 
   //make sure that any other button press (upload, rerecord) also stops
   //playback first)
    if (playing) {
        record.stop();
        $("#playBack").text("listen back");
        playing = false;
    } else {
        record.play();
        $("#playBack").text("Stop");
        playing = true;
    }
}

function reRecord(){
    //re-record button pressed.  go back to record screen, reset this screen,
    //delete audio if it exists.
    if (playing) {
        record.stop();
        $("#playBack").text("listen back");
        playing = false;
    }

    $("#page3").attr("hidden", "true");
    $("#page2").removeAttr("hidden");

}

function uploadAudio() {
    //upload audio, on success change to final page
    //on fail, give help email and advice to come back and try again
    if (playing) {
        record.stop();
        $("#playBack").text("listen back");
        playing = false;
    }
   
    $("#upload").css("visibility", "hidden");
    $("#reRecord").css("visibility", "hidden");
    $("#playBack").css("visibility", "hidden");

    var win = function (r) {
        $("#statusUpload").text("success!");
        $("#page3").attr("hidden", "true");
        $("#page4").removeAttr("hidden");
    }

    var failUp = function (e) {
        navigator.notification.alert("Oops, we can't connect to the server!  Check the internet connection and try again. If the problem persists, contact help@mindsprout.co", null, 'MindSprout Error ' + e.code, "OK");
        $("#statusUpload").css("visibility","hidden");
        $("#upload").css("visibility","visible");
        $("#reRecord").css("visibility","visible");
        $("#playBack").css("visibility","visible");
    }

    var options = new FileUploadOptions();
    options.fileKey = "audio";
    options.fileName = email + ".wav";
    options.mimeType = "audio/wav";
    options.chunkedMode = false;
    options.headers = {Connection: "close"};

    $("#statusUpload").text("uploading");
    $("#statusUpload").css("visibility","visible");

    var ft = new FileTransfer();
    var percent = 0;
    ft.onprogress = function(progressEvent) {
        if (progressEvent.lengthComputable) {
            percent = progressEvent.loaded / progressEvent.total;
        } else {
            percent = percent + 1;
        }
        
        $("#statusUpload").text("upload... " + Math.round(percent*100)  + "%");
        console.log(percent);
    };
    

    ft.upload(fileURL, encodeURI("http://feedback.media.mit.edu:3000/upload"), win, failUp, options);
    //ft.upload(fileURL, encodeURI("http://localhost:3000/upload"), win, failUp, options);
    //ft.upload(nativeURL, encodeURI("http://localhost:3000/upload"), win, failUp, options);

}
