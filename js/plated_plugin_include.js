

/***************************************************************************
--[[#js.plated_plugin_include

A blog plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_include = require("./plated_plugin_include.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

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

	var plated_plugin_include={};
	
	plated_plugin_include.chunks=[]
	
	plated_plugin_include.config={};

// special chunk names that trigger include processing

// json settings for the include
//		_include_json



/***************************************************************************
--[[#js.plated_plugin_include.process_dirs

	dirs = plated_plugin_include.process_dirs(dirs)

Tweak all the base chunks grouped by dir name and pre cascaded/merged

]]*/
	plated_plugin_include.process_dirs=function(dirs){
				
		plated_plugin_include.chunks=[]

		for( var dirname in dirs ) { var chunks=dirs[dirname];
			if(chunks._include_json)
			{
				chunks._include_json.dirname=dirname
				plated_plugin_include.chunks.push(chunks)
			}
		}
		
		return dirs;
	};


/***************************************************************************
--[[#js.plated_plugin_include.process_file

	chunks = plated_plugin_include.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be available.

]]*/
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


/***************************************************************************
--[[#js.plated_plugin_include.process_output

	plated_plugin_include.process_output(chunks)

Output any extra files associated with this file or directory.

]]*/
	plated_plugin_include.process_output=function(chunks){
		
		for( var idx=0; idx<plated_plugin_include.chunks.length ; idx++ )
		{
			var include_chunks=plated_plugin_include.chunks[idx]
			var it=include_chunks._include_json

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
				plated.chunks.deepmerge( plated.chunks.remove_underscorechunks(include_chunks),newchunks)

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

console.log(timestr()+" INCLUDE "+ chunks._output_filename +" -> "+ path.join( it.dirname , output_filename )  )

			}
			
		}



	};

	return plated_plugin_include;
};
