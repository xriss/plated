

var fs = require('fs');
var util=require('util');
var path=require('path');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }


exports.create=function(opts,plated){
	plated=plated || {};
	
	var plated_files =plated.files =require("./plated_files.js" ).create(opts,plated);
	var plated_chunks=plated.chunks=require("./plated_chunks.js").create(opts,plated);
	var plated_blog=plated.blog=require("./plated_blog.js").create(opts,plated);
	
	plated.process_dirs=[ plated_blog.process_dirs ];
	plated.process_file=[ plated_blog.process_file ];
	
	plated.build=function()
	{
		return plated_files.build();
	};

	plated.watch=function()
	{
		return plated_files.watch();
	};

	return plated;
}
