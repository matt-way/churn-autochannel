
var async = require('async'),
	_ = require('underscore'),
	API = require('./api');

var util = require('util');

function AutoChannel(_id, _dataFolder) {
	this.id = _id;
	this.feeds = [];

	// load any applicable
	this.file = require('./json')(_dataFolder + '/' + _id + '.json');
	this.feedData = this.file.data();
}

AutoChannel.prototype.addFeed = function(feed) {
	this.feeds.push(feed);
};

// Main process function for channel feed processing
AutoChannel.prototype.process = function(_callback) {
	var self = this;

	// go through each feed and get the most recent feed data
	async.each(this.feeds, function(feed, _cb){
		var url = feed.getURL();
		feed.process(self.feedData[url], function(err, lastUpdated){
			if(err) { 
				console.log('error processing feed: ' + err);
			}else{
				// update the last updated time
				self.feedData[url] = lastUpdated;
			}
			// run the callback without errors because we still want to process which videos were loaded			
			_cb();
		});
	}, function(err){		
		if(err) {
			// fatal error running feed process - should never get here
			return _callback(err);
		}

		// go through each feed and concatenate all the data into a single sorted item list				
		self.itemList = [];
		_.each(self.feeds, function(feed){
			self.itemList = self.itemList.concat(feed.getItems());
		});		
		// sort the list
		self.itemList = _.sortBy(self.itemList, function(item){
			return item.time;
		});
		// remove any duplicates
		self.itemList = _.uniq(self.itemList, true, function(item){			
			return item.time;
		});
		

		// next go through each item and use the churn api to add the video
		async.eachSeries(self.itemList, function(item, icb){
			console.log('adding video: ' + item.id);
			
			API.addVideo(self.id, 'http://www.youtube.com/watch?v=' + item.id, item.token, function(err){
				if(err) { console.log('error adding video: ' + util.inspect(err, false, null)); }
				// dont pass erorr on
				icb();
			});			
		}, function(err){
			if(err) { return_callback(err); }

			// save the updated last time updated file for the channel
			// NOTE: if the app crashes during the api calls and before this gets updated
			// next run will produce duplicate videos
			self.file.save();

			// the processing is complete
			_callback();
		});		
	});	
};

module.exports = AutoChannel;