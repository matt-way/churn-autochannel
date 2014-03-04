
var FeedParser = require('feedparser'),
	request = require('request'),
	async = require('async');

var util = require('util');

function Feed(_data, _token) {
	this.token = _token;
	this.data = _data;

	this.items = [];
}

// get any associated item time from a feed item
Feed.prototype.getItemTime = function(_item) {
	var datetime = _item.date || _item.pubdate;
	if(datetime){
		return datetime.getTime();
	}
	return 0;
};

// parse a feed item, extracting any youtube video content
Feed.prototype.parseItem = function(_item, _callback) {
	// check if the link or linked item contains a youtube video in the summary
	var reg = /(?:http|https|)(?::\/\/|)(?:www.|)(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/ytscreeningroom\?v=|\/feeds\/api\/videos\/|\/user\S*[^\w\-\s]|\S*[^\w\-\s]))([\w\-]{11})[a-z0-9;:@?&%=+\/\$_.-]*/;
	
	if(!_item.link) {
		return _callback();
	}

	var linkMatches = _item.link.match(reg);
	if(linkMatches){
		return _callback(null, linkMatches[1]);
	}else{
		// delve deeper into the item
		request(_item.link, function(err, res, body){
			if(err){ return _callback(err); }
			
			// attempt to extract the first youtube embed url from the page
			var matches = body.match(reg);			
			return _callback(null, matches ? matches[1] : null);	    			
		});
	}	
};

// modified from feedparser example
// https://github.com/danmactough/node-feedparser/blob/master/examples/iconv.js
Feed.prototype.fetch = function(done) {
	var self = this;

	// Define our streams
	console.log('processing feed: ' + self.data.url);
	var req = request(self.data.url, {timeout: 25000, pool: false});
	req.setMaxListeners(50);
	// Some feeds do not response without user-agent and accept headers.
	req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36')
		 .setHeader('accept', 'text/html,application/xhtml+xml');

	var feedparser = new FeedParser();

	// Define our handlers
	req.on('error', done);
	req.on('response', function(res) {
		var stream = this;			

		if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));

		// parse the feed
		stream.pipe(feedparser);
	});

	feedparser.on('error', done);
	feedparser.on('end', done);
	
	feedparser.on('readable', function() {
		var post;
		while (post = this.read()) {	
			// update the most recent timestamp of the received items
			var time = self.getItemTime(post);
			self.lastUpdated = Math.max(self.lastUpdated, time);

			// add the post item to the to-be-parsed list
			// we cannot parse here, because feedparser doesn't cater
			// to async processes inside 'readable'
			// also, only process items who come after the last process time			
			if(time > self.curLastUpdated){				
				self.tobeParsed.push({
					data: post,
					time: time
				});			
			}
		}
	});
}

// main feed processing function
Feed.prototype.process = function(_lastUpdated, _callback) {
	var self = this;
	self.lastUpdated = _lastUpdated || 0;
	self.curLastUpdated = self.lastUpdated;
	self.tobeParsed = [];
	self.items = [];
	this.fetch(function(err){
		// ensure that no items are returned for some reason upon feed error
		if(err) { 
			self.tobeParsed = [];
			self.items = []; 
			_callback(err, _lastUpdated);
		}else{
			// parse the item for videos
			// as this is async we need to catch when completed
			async.eachSeries(self.tobeParsed, function(post, _cb){				
				self.parseItem(post.data, function(err, id){
					if(err) { 
						console.log('error processing feed item: ' + util.inspect(err, false, null)); 
					}else{						
						if(id){
							self.items.push({
								id: id,
								time: post.time,
								token: self.token
							});
						}
					}
					// don't pass the error forward, as other items might be fine
					// just ignore the erroring item
					_cb();
				});			
			}, function(err){
				_callback(err, self.lastUpdated);
			});			
		}		
	});
};

Feed.prototype.getURL = function() {
	return this.data.url;
};

Feed.prototype.getItems = function() {
	return this.items;
};

module.exports = Feed;