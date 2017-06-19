
var fs = require('fs');
var util=require('util');
var path=require('path');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_plugin_include={};
	
	
	plated_plugin_include.config={};

// special chunk names that trigger include processing

// json settings for the include
//		_include_json



// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_plugin_include.process_dirs=function(dirs){
				
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			if(chunks._include_json)
			{
			}

		}
		
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
	plated_plugin_include.process_file=function(chunks){
		
// process include_json
		var chunk=chunks._include_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			
			chunks._include_json=chunk;
		}
		
		return chunks;
	};


	return plated_plugin_include;
};
