
/***************************************************************************
--[[#js.plated_output

Manage the chunks of text that are combined into a page.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_output = require("./plated_output.js").create(opts,plated)

This is called automatically when the plated module is created and the 
return value is made available in plated.chunks note that all of these 
modules are bound together and operate as a group with shared data.

In the future when we talk about this module and its available 
functions we are referring to the return value from this create 
function.

]]*/

var fs = require('fs')
var util=require('util')
var path=require('path')
var watch=require('watch')
var JSON_stringify = require('json-stable-stringify')

var ls=function(a) { console.log(util.inspect(a,{depth:null})) }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){
	
	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, "") }

	var plated_output={}

	plated_output.remember=function( chunks )
	{
		plated.output_chunks[ chunks._output_filename ]=chunks
		return chunks
	}

	plated_output.remember_and_write=function( chunks )
	{
		plated.output_chunks[ chunks._output_filename ]=chunks
		plated_output.write(chunks)
		return chunks
	}

	plated_output.write=function( chunks )
	{
		// run chunks through plugins, eg special blog handling
		for(var idx in plated.process_output) { var f=plated.process_output[idx];
			f( chunks ); // output special extra files
		}

		var output_filename=chunks._output_filename
		var output_chunkname=chunks._output_chunkname

		if(output_chunkname)
		{
			var filename=path.join( opts.output , output_filename )
			var data=plated.chunks.replace( plated.chunks.delimiter_wrap_str( output_chunkname ) , chunks )
			plated.files.write( filename , data )
		}
		if(opts.dumpjson)
		{
			var filename=path.join( opts.output , output_filename ) + ".json"
			var data=JSON_stringify(chunks,{space:1})
			plated.files.write( filename , data )
		}
		
	}

	plated_output.write_all=function()
	{
		for( var n in plated.output_chunks )
		{
			var chunks=plated.output_chunks[n]
			plated_output.write(chunks)
		}
	}

	return plated_output
}
