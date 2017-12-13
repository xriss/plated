

/***************************************************************************
--[[#js.plated_plugin.copy

A blog plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_copy = require("./plated_plugin_copy.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

This plugin is intended to duplicate part of a site into another 
directory with possibly tweaked chunks, this is primarily intended for 
text translations. We produce for instance pure text chunks containing 
just english text and replace these chunks with french versions inside 
a fra directory.

Note that we only copy chunkfiles not all data files, so this is 
only about duplicating files that are rendered from chunks.

]]*/

/***************************************************************************
--[[#html.plated_plugin.copy

	#^_copy_json
	{
		include:[
			"",
		],
		exclude:[
			"fra",
			"spa",
		],
	}

A chunk of this name must be created in a directory scope file for this 
plugin to parse it. include is a list of prefixes to include and 
exclude is a list of prefixes within the include to exclude.

The above configuration is assumed to be within a file fra/^.index and 
spa/^.index so it would include all chunkfiles from root but exclude 
files in fra or spa, ie itself. This way we can have a default english 
site and a spanish translation under spa/ or french under fra/

The files are copied into the current directory without the prefix used 
in include.

An example can be found in test-source/006-copy

]]*/

var fs = require('fs');
var util=require('util');
var path=require('path');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_plugin_copy={};
	
	plated_plugin_copy.chunks=[]
	
	plated_plugin_copy.config={};

// special chunk names that trigger copy processing

// json settings for the copy
//		_copy_json



/***************************************************************************
--[[#js.plated_plugin.copy.process_dirs

	dirs = plated_plugin_copy.process_dirs(dirs)

Remember all the _copy_json chunks we can find inside our 
plated_plugin_copy.chunks array. This will be used later to 
replicated output into other locations with slight chunk tweaks.

]]*/
	plated_plugin_copy.process_dirs=function(dirs){
				
		plated_plugin_copy.chunks=[]

		for( var dirname in dirs ) { var chunks=dirs[dirname];
			if(chunks._copy_json)
			{
				chunks._copy_json.dirname=dirname
				plated_plugin_copy.chunks.push(chunks)
			}
		}
		
		return dirs;
	};


/***************************************************************************
--[[#js.plated_plugin.copy.process_file

	chunks = plated_plugin_copy.process_file(chunks)

Auto magically parse _copy_json chunks as json.

]]*/
	plated_plugin_copy.process_file=function(chunks){
		
// process copy_json
		var chunk=chunks._copy_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			
			chunks._copy_json=chunk;
		}
		
		return chunks;
	};


/***************************************************************************
--[[#js.plated_plugin.copy.process_output

	plated_plugin_copy.process_output(chunks)

Compare this output file with cached copy chunks and duplicate it 
into these directories with slightly tweaked chunks if it matches.

]]*/
	plated_plugin_copy.process_output=function(chunks){
		
		for( var idx=0; idx<plated_plugin_copy.chunks.length ; idx++ )
		{
			var copy_chunks=plated_plugin_copy.chunks[idx]
			var it=copy_chunks._copy_json

			var filename=chunks._output_filename

			var active=false
			
			for( var include_idx in it.include )
			{
				var include_name=it.include[include_idx]
				
				if( filename.startsWith(include_name) )
				{
					active=true
					filename=filename.substr( include_name.length )
					break
				}
			}

			for( var exclude_idx in it.exclude )
			{
				var exclude_name=it.exclude[exclude_idx]

				if( filename.startsWith(exclude_name) )
				{
					active=false
					break
				}
			}
			
			if(active)
			{

				var output_filename=filename
				var output_chunkname=chunks._output_chunkname
				
				var newchunks=plated.chunks.deepmerge(chunks,{})
				plated.chunks.deepmerge( plated.chunks.remove_underscorechunks(copy_chunks),newchunks)

				if(output_chunkname)
				{
					var filename=path.join( opts.output , it.dirname , output_filename )
					var data=plated.chunks.replace( plated.chunks.delimiter_wrap_str( output_chunkname ) , newchunks )
					plated.files.write( filename , data )
				}
				if(opts.dumpjson)
				{
					var filename=path.join( opts.output , it.dirname , output_filename ) + ".json"
					var data=JSON_stringify(newchunks,{space:1})
					plated.files.write( filename , data )
				}

console.log(timestr()+" COPY "+ chunks._output_filename +" -> "+ path.join( it.dirname , output_filename )  )

			}
			
		}



	};

	return plated_plugin_copy;
};
