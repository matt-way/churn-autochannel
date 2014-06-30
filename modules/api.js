
var request = require('request'),
	http = require('http');

var host = process.env.AC_HOST || 'api.churn.tv';
var port = process.env.AC_PORT || '80';
console.log('setting up autochannel for host: ' + host + ":" + port);

// add a video to churn
exports.addVideo = function(channelId, videoURL, token, _callback) {

/*
	//var url = 'http://' + host + '/api/channel/' + channelId + '/video/add?access_token=' + token;
	var url = host + '/channel/' + channelId + '/video/add';
	console.log('attempting url: ' + url);
	request.post({
		url: url,
		auth: {
			bearer: token
		},
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
*/

	var path = '/channel/' + channelId + '/video/add?url=' + videoURL;

	//The url we want is `www.nodejitsu.com:1337/`
	var options = {
		host: host,
		port: port,
		path: path,
		method: 'POST',
		headers: {
			'Authorization': 'Bearer ' + token
		}
	};

	callback = function(response) {
		var str = ''
		response.on('data', function (chunk) {
			str += chunk;
		});

		response.on('error', function(err){
			console.log(err);
			_callback(err);
		});

		response.on('end', function () {
			//console.log(str);
			_callback();
		});
	};

	var req = http.request(options, callback);
	req.end();
};