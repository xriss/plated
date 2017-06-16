
var fs = require('fs');
var util=require('util');
var JSON5=require('json5');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var plated_redirect={};
	
	
	plated_redirect.config={};

// main settings that you can override in your redirect_json config chunk
	plated_redirect.config.html="";


// special chunk names that trigger redirect processing

// json settings for the redirect
//		_redirect_json



// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_redirect.process_dirs=function(dirs){
				
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			
			if(chunks._redirect_json)
			{
				ls( chunks._redirect_json );
			}

		}
		
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
	plated_redirect.process_file=function(chunks){
		
// process redirect_json
		var chunk=chunks._redirect_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			
			chunks._redirect_json=chunk;
		}
		
		return chunks;
	};


	return plated_redirect;
};
