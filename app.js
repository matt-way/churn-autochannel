
var _ = require('underscore'),
	async = require('async'),
	acFile = require('./modules/json')(__dirname + '/' + 'autochannels.json'),
	acData = acFile.data(),
	AutoChannel = require('./modules/autochannel'),
	Feed = require('./modules/feed');

var util = require('util');

// rerun interval (default 3 hours)
var interval = process.env.AC_INTERVAL || 3*60*60*1000;

var channels = [];

// create all the feed objects
_.each(acData.channels, function(channel){
	var ac = new AutoChannel(channel.channelId, process.env.AC_DATALOCATION || __dirname + '/channeldata');
	channels.push(ac);

	// create each feed object
	_.each(channel.feeds, function(feed){
		ac.addFeed(new Feed(feed, acData.tokens[feed.tokenId]));
	});	
});

function processLoop() {
	// process each channel
	async.each(channels, function(channel, _callback){
		channel.process(_callback);
	}, function(err){
		if(err){ console.log('error running autochannel: ' + err); }

		console.log('processing iteration complete');

		// processing complete, so restart
		setTimeout(function(){
			processLoop();
		}, interval);	
	});	
}

// start the main app loop
processLoop();