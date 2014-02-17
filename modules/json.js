

var fs = require('fs');

var cache = {};

function JSONFile(filename) {	
	this._data = {};
	this.filename = filename;

	this.load(filename);
}

JSONFile.prototype.load = function() {	
	try{
		this._data = JSON.parse(fs.readFileSync(this.filename, 'utf8'));  	
	}catch(err){
		if(err.code !== 'ENOENT') { throw err; }
		// ignore file not found
		this._data = {};
	}
};

JSONFile.prototype.save = function() {
	try{
		fs.writeFileSync(this.filename, JSON.stringify(this._data));		
	}catch(err){
		// simply log error
		console.log('error saving file: ' + this.filename + ' ' + err);
	}	
};

JSONFile.prototype.data = function() {
	return this._data;
};

module.exports = function(filename) {
	// return the load cache if available
	if(!cache[filename]){ 
		cache[filename] = new JSONFile(filename);
	}
	return cache[filename];
};