#!/usr/bin/env node



/***************************************************************************
--[[#cmd.plated

	plated

The commandline interface to plated, the options passed into this 
command are actually the same as the options passed into the opt object 
when creating the js.plated module.

]]*/

/***************************************************************************
--[[#cmd.plated.build

	plated build 
	
The build action, output files are created once and then the command 
returns.

	--site=
	
How we should link to this site if the link can not be relative, eg 
normally we would just use /index.html to reach a file in the root of 
the current site but if this html is going to be rendered somewhere 
else then this trick would no longer work and we would have to use this 
value instead. An example of when this might happen is the publishing of 
rss feeds.

	--root=

The root of the site we are building, normally empty in which case we 
maintain a relative path back to the root depending on how far we have 
descended into the directory structure, eg ../../ It is recomended that 
this be used whenever constructing a url, for instance linking to the 
root index.html should be done like sp {_root}index.html rather than 
/index.html if you want to ensure you have a site that can be built 
into a directory as well as a domain.

	--source=source
	
Where to read the source files from, this is relative to the current 
directory and all files are found recursively from this point. We also 
follow soft directory symlinks so we can easily pull in extra files from 
elsewhere.

	--output=output

The output directory relative to the current directory. Please be very 
careful with this location as this will be emptied recursively before we 
write anything into it.

	--hashfile=^

The magic string used to trigger special chunk parsing, files are 
either scoped to the directory in which case they are just this magic 
string plus any extension. For example ^.html or they are intended to 
create specific files in which case ^. will be stripped and the 
remainder used as an output. For example index.^.html which would 
create an index.html in the output, the extension is used to pick the 
chunk that is rendered into the output file. In this case it would be 
the html chunk.

	--hashchunk=#^

The magic string used to split the input files into chunks, it must be 
used at the start of a line to trigger special processing and the 
default has been specifically chosen as something unlikely to be typed 
by accident.

	--delimiter={}
	
The magic string used to wrap tags for special processing in chunk 
files. We spit this string in the middle with the beginning getting the 
larger half if the string is an odd length and use both sides as 
start/stop strings. So "${}" will work as expected with the opener 
being "${" and the closer "}". The default of "{}", might look 
dangerous for C like languages which use {} to wrap blocks but due to 
the limits on contents (no white space) and the fallback of outputting 
exactly the same as the input, eg {} will output {}. C like languages 
are very unlikely to trigger any special processing. 

	--dumpjson
	
A Boolean flag to enable the output of .json chunk dumps as well as 
processed output files. This is useful for debugging and also provides 
enough data to recreate pages at run time should that be necessary.

]]*/



/***************************************************************************
--[[#cmd.plated.watch

	plated watch
	
Build once and then watch all the files in source folder with any 
change triggering a rebuild.

This combined with a simple server and being careful to disable the 
html cache, can be used for live updates as you edit the source files.

This uses the same options as plated.build so please view the 
descriptions of all available options there.

]]*/


var cmd=exports;

var util=require('util');

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }


var yargs = require('yargs/yargs')(process.argv.slice(2))
var argv = yargs.argv ; global.argv=argv;


var env=process.env

argv.site      = argv.site      || env.PLATED_SITE      || "";
argv.root      = argv.root      || env.PLATED_ROOT      || "";
argv.source    = argv.source    || env.PLATED_SOURCE    || "source";
argv.output    = argv.output    || env.PLATED_OUTPUT    || "output";
argv.hashfile  = argv.hashfile  || env.PLATED_HASHFILE  || "^";
argv.hashchunk = argv.hashchunk || env.PLATED_HASHCHUNK || "#^";
argv.delimiter = argv.delimiter || env.PLATED_DELIMITER || "{}";
argv.dumpjson  = argv.dumpjson  || env.PLATED_DUMPJSON  ;

(async()=>{
	
if( argv._[0]=="build" )
{
	var plated=require("./plated.js").create(argv);
	return await plated.build();
}
else
if( argv._[0]=="watch" )
{
	var plated=require("./plated.js").create(argv);
	return await plated.watch();
}
else
if( argv._[0]=="blog" )
{
	var plated=require("./plated.js").create(argv);
	return await plated.blog();
}

// help text
console.log(
	"\n"+
	"> plated build \n"+
	"\tBuild all files in source folder into output folder.\n"+
	"\t\t--site=          -- site, eg http://site.com/ for use in explicit links.\n"+
	"\t\t--root=          -- root dir of site, eg / else we work out a relative path.\n"+
	"\t\t--source=source  -- choose the source folder.\n"+
	"\t\t--output=output  -- choose the output folder.\n"+
	"\t\t--hashfile=^     -- choose the magic string used in filenames.\n"+
	"\t\t--hashchunk=#^   -- choose the magic string used in chunks.\n"+
	"\t\t--delimiter={}   -- choose the magic string used for wrapping tags.\n"+
	"\t\t--dumpjson=      -- Enable json output of chunks when parsing.\n"+
	"\n"+
	"> plated watch \n"+
	"\tBuild and then watch all files in source folder, rebuilding if they change.\n"+
	"\t\t...same options as build\n"+
	"\n"+
	"> plated blog this is the title of my blog post \n"+
	"\tCreate an empty blogpost with todays date and the given title in the source blog directory.\n"+
	"\t\t--blog=blog      -- choose the blog folder. \n"+
	"\t\t...same options as build\n"+
	"\n"+
"");

})()
