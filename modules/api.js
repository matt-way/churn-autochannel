
var request = require('request');

var host = process.env.AC_HOST || 'churn.tv';
console.log('setting up autochannel for host: ' + host);

// add a video to churn
exports.addVideo = function(channelId, videoURL, token, _callback) {

	var url = 'http://' + host + '/api/channel/' + channelId + '/video/add?access_token=' + token;
	request.post({
		url: url,
		json: {
			data: {
				url: videoURL
			}
		}
	}, function(err, res, body){
		if(err) { return _callback(err); }

		if (res.statusCode != 200) {
            return _callback(body);
        }		
		_callback();
	});		
};