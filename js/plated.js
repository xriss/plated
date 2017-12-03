
/***************************************************************************
--[[#plated.test

PLATED
======

This is some test markdown to see if it is found.


]]*/




var fs = require('fs');
var util=require('util');
var path=require('path');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }


exports.create=function(opts,plated){
	plated=plated || {};

	plated.setup=function(opts)
	{
		plated.output_chunks={};

		plated.files =require("./plated_files.js" ).create(opts,plated);
		plated.chunks=require("./plated_chunks.js").create(opts,plated);
		plated.output=require("./plated_output.js").create(opts,plated);
		plated.process_dirs=[];
		plated.process_file=[];
		plated.process_output=[];
	};
	
	plated.plugin=function(it)
	{
		if(it.process_dirs  ) { plated.process_dirs.push(  it.process_dirs  ); }
		if(it.process_file  ) { plated.process_file.push(  it.process_file  ); }
		if(it.process_output) { plated.process_output.push(it.process_output); }
	}
		
	plated.build=function()
	{
		return plated.files.build();
	};

	plated.watch=function()
	{
		return plated.files.watch();
	};


// load default plugins

	plated.setup(opts);
	plated.plugin(require("./plated_plugin_docs.js"    ).create(opts,plated));
	plated.plugin(require("./plated_plugin_blog.js"    ).create(opts,plated));
	plated.plugin(require("./plated_plugin_redirect.js").create(opts,plated));
	plated.plugin(require("./plated_plugin_include.js" ).create(opts,plated));

	return plated;
}
