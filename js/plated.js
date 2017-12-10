
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

/***************************************************************************
--[[#html.plated

Plated operates on a directory structure of files and simply copies the 
files it does not understand into the output. As such you could have an 
almost 100% generic static site with only a few special files getting 
special treatment dependent on their name containing a ^. sequence of 
characters.

]]*/

/***************************************************************************
--[[#html.plated.files

A special string triggers chunk file processing, by default this is ^. 
but it can be changed to another character or string when plated is 
invoked. ^. seems to be a reasonably safe yet generally unused sequence 
of characters in file names.

Chunk files are text files containing chunks of text assigned to 
symbolic names, these chunks can then be referenced by tags contained 
in other chunks and expanded to build final output files. This is 
intended to be simple macro expansion only rather than a complex 
programming language. Any programming would take place in a plugin, for 
instance we sinclude a blog plugin helps build blog style websites on 
top of this base chunk system. Or possibly even more tweaking can 
happen inside js running in the page when it is viewed, it is entirely 
possible to run plated in a page client side as well as server side.

There are two basic types of chunk files, directory scope and file 
scope. Directory scope chunk files contain chunks that can be 
referenced by any other chunk file in their directory as well as any 
sub directories. Directory scope chunks declared inside a sub directory 
will replace any chunks defined higher up the path, this allows us to 
adjust and group data using hierarchical directories.

	^.html
	^.css
	^.md
	^.what.ever.you.like

Are all examples of directory scoped chunk files, they do not create 
any output files themselves but are parsed to provide directory scope 
chunks which can be used in other chunk files. It does not matter what 
extension is used, primarily it is intended to be used as a clue to 
editors to provide appropriate language highlighting. By convention css 
chunks would be placed inside ^.css and html chunks inside ^.html but 
this is in no way enforced or necessary for plated to work.


	index.^.html
	layout.^.css
	hacks.^.js
	
Are all examples of file scoped chunk files. Each one will create a 
file in the output directory with the same path but the name altered 
slightly to remove ^. from it. For example index.^.html becomes 
index.html

The extension used selects the chunk name that will be rendered into 
the output file. So index.^.html will render its html chunk and 
layout.^.css will render its css chunk.

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
