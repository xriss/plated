
/***************************************************************************
--[[#js.plated

Plated is a static site generator that uses a cascading chunk system to 
describe the output pages.

Since we are using node we are also able to dynamically build the pages 
in the browser, which is why we include json dumps of the chunk data. 
This provides enough data to reconstruct pages client side.

Included are a handful of plugins that do slightly more complicated 
things to enable extra functionality such as page redirects or 
generating blogs.


This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated=require("./plated.js").create(opts,plated)

opts is an object of options and plated is an optional input if 
provided it will be modified and returned otherwise a new object will 
be created and returned.

We also load and setup this and all the builtin plugins so after 
calling this we are good to go.

In the future when we talk about plated and its available functions we 
are referring to the return from this create function.

The opts is intended to be filled with command line options so take a 
look at these for a full description of what can be passed in here.

]]*/


var fs = require('fs');
var util=require('util');
var path=require('path');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

exports.create=function(opts,plated){
	plated=plated || {};

/***************************************************************************
--[[#js.plated.setup

	plated.setup(opts)

Initialise plated and require the base plated modules: files, chunks 
and output.

]]*/
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
	
/***************************************************************************
--[[#js.plated.plugin

	plated.plugin(it)

Register a plugin, each plugin can provide the following function hooks.

	dirs = it.process_dirs( dirs )

Adjust the registered dirs data and return it.

	file = it.process_file( file )

Adjust or react to the file data and return it.

	it.process_output( chunks )

Adjust a files chunks prior to writing it out, or, output extra data 
associated with these chunks.

]]*/
	plated.plugin=function(it)
	{
		if(it.process_dirs  ) { plated.process_dirs.push(  it.process_dirs  ); }
		if(it.process_file  ) { plated.process_file.push(  it.process_file  ); }
		if(it.process_output) { plated.process_output.push(it.process_output); }
	}
		
/***************************************************************************
--[[#js.plated.build

	plated.build()

Build all the output files from the inputs.

]]*/
	plated.build=function()
	{
		return plated.files.build();
	};

/***************************************************************************
--[[#js.plated.watch

	plated.watch()

Continuously build the output files from the inputs whenever one of the input files changes

]]*/
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
