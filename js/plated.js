
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

A special string in the filename triggers chunk file processing, by 
default this is ^. but it can be changed to another character or string 
when plated is invoked. ^. seems to be a reasonably safe yet generally 
unused sequence of characters in file names.

Chunk files are text files containing chunks of text assigned to 
symbolic chunknames, these chunks can then be referenced by tags 
contained in other chunks and expanded to build final output files. 

This is intended to be simple macro expansion only rather than a 
complex programming language. Any programming would take place in a 
plugin, for instance we include a blog plugin that helps build blog 
style websites on top of this base chunk system.

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
the output file. So index.^.html will render the html chunk into the 
output file and layout.^.css will render the css chunk.

Usually pages in a directory will share the same layout, so a html 
chunk will be declared at the directory level with the file just adding 
a content chunk to be rendered inside this page structure. The 
cascading chunk system means you are free to alter this in sub 
directories but often pages have a lot in common so keeping a bunch of 
generic layout chunks in the root with sub directories just picking 
from them works perfectly. The idea is to provide data organisational 
tools but not to dictate the use.

]]*/

/***************************************************************************
--[[#html.plated.chunks

Chunk files are parsed one line at a time to break them into a number 
of named chunks, lines that begin with the special characters #^ 
trigger special processing all other lines are simple assigned to the 
current chunk. eg:

	#^chunkname
	here is some text
	that will be assigned to chunkname

A chunk ends when we run out of file or we start another chunk.

As well as the chunk name we can also add some flags to change how the 
chunk is processed. These flags are added by name=value pairs after the 
chunkname and separated by white space.

	#^chunkname flag=value otherflag=othervalue

These values are intended to change how the chunk is processed here are 
the ones that we currently support. Multiple flags can of course be 
applied to the same chunk.

	#^chunkname trim=ends

This flag will cause all whitespace to be removed from the beginning 
and end of the chunk. Useful if you intend to include a chunk in a html 
attributes as newlines would would mess that up.

	#^chunkname form=json

Parse the text as json, this allows for structured data or arrays to be 
defined in chunks. This data can be referenced inside macro expansion 
using the . operator to reference members. Most plugins have a json 
chunk containing their settings.

	#^chunkname form=markdown

This text will be parsed as markdown and converted into html. Markdown 
is an easy way to create simple formated content for blog posts or just 
pages in general. Note that the default format is just to leave the 
text of the chunk unprocessed which means normal html tags.

Chunk names that begin with an underscore are considered internal 
plated chunks ans some will be provided by the plated code for each 
page rendered. Here is a list of chunks that will be provided by the 
system.

	#^chunkname same=replace

This alters how we replace chunks when they are declared twice, 
normally the chunk in the lowest level will simply replace a chunk 
declared elsewhere. This is the default setting.

	#^chunkname same=append

If we change to append mode then chunks lower down will be appended to 
the higher up chunks. This is very useful for css chunks where we can 
append rules as we cascade down and these rules will take precedence 
over the earlier rules due to the magic of css.

	#^chunkname same=merge

This should only be used with a json chunk, it merges the data with its 
parent chunk so we can change or add values as we cascade down through 
the directories similar to append but working as objects rather than 
just plan text. This is why it should only be used with json chunks.

	#^_root

This will be set to a url that gets to the root of this website and 
should be used in front of all urls to make sure that we can find the 
files we want. This can be passed in on the command line and / is a 
good way to think of this value. The default is actually for plated to 
provide a relative url such as ../../ that would get you to the root of 
the site from the current page. You should be using _root as the prefix 
for all urls when including css or js or images etc in a html file.

	#^_sourcename

This will be set to the filename of the input source file that we are 
currently rendering.

	#^_filename

This will be set to url of the file that we are currently rendering.

	#^_dirname

This will be set to url of the directory containing the file that we 
are currently rendering.

	#^_flags

This is an object containing flag data for the defined chunks, most 
chunks will not have any flags defined but if they are they can be 
found in for example  _flags.chunkname.flagname which would hold the 
value of flagname for the given chunkname. This is really just for 
internal processing and should not need to be referenced by the user.

As well as the provided chunks there are some special names exist to 
trigger plugin behaviour and need to be defined with the correct 
configuration data, for instance

	#^_docs_json
	
Is the name of a chunk containing configuration data in json format 
that enables the docs plugin to create pages such as the ones that you 
are currently reading. See html.plated.plugins for documentation on how 
to use them and what data must be provided. All you need to know is 
that any chunk name that begins with an underscore belongs to the 
plated system itself and must only be created according to the 
documentation.

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
