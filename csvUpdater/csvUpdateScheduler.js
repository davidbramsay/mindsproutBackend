var cronJob = require('cron').CronJob;
var csvUpdate = require('./csvUpdate').update;


csvUpdate();

var job = new cronJob({
  cronTime: '00 00 24 * * *',
  onTick: function() {
    // Runs every weekday at 12 AM
    console.log("csv update script running : " + Date.now());
    csvUpdate();
  },
  start: false,
  timeZone: "America/New_York"
});

job.start();


