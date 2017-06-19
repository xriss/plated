
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');
var JSON_stringify = require('json-stable-stringify');

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){
	
	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_output={};

	return plated_output;
};
