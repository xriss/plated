
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

//var fs = require('fs')
var util=require('util')
var watch=require('watch')
var JSON_stringify = require('json-stable-stringify')

var ls=function(a) { console.log(util.inspect(a,{depth:null})) }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){
	
	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, "") }

	var plated_output={}

/***************************************************************************
--[[#js.plated_output.remember

	chunks = plated_output.remember(chunks)

Remember this page, the name is expected to be found in 
chunks._output_filename and this is used as the key to store these 
chunks.

]]*/
	plated_output.remember=function( chunks )
	{
		plated.output_chunks[ chunks._output_filename ]=chunks
		return chunks
	}

/***************************************************************************
--[[#js.plated_output.remember_and_write

	chunks = await plated_output.remember_and_write(chunks)

The same as remember but also instantly write out the chunks using 
plated_output.write

]]*/
	plated_output.remember_and_write=async function( chunks )
	{
		plated.output_chunks[ chunks._output_filename ]=chunks
		await plated_output.write(chunks)
		return chunks
	}

/***************************************************************************
--[[#js.plated_output.write

	await plated_output.write(chunks)

Write out the chunks to to _output_filename as its final page like 
form. chunks._output_chunkname is the name of the chunk that we intend 
to render into this page, eg "html" 

opts.output is the directory we are going to write the file into.

If the opts.dumpjson flag is set then we also output a 
.json file which contains the chunks used to construct this page.

]]*/
	plated_output.write=async function( chunks )
	{
		// run chunks through plugins, eg special blog handling
		for(var idx in plated.process_output) { var f=plated.process_output[idx];
			await f( chunks ); // output special extra files
		}

		var output_filename=chunks._output_filename
		var output_chunkname=chunks._output_chunkname

		if(output_chunkname)
		{
			var filename=plated.files.joinpath( opts.output , output_filename )
			var data=plated.chunks.replace( plated.chunks.delimiter_wrap_str( output_chunkname ) , chunks )
			await plated.files.write( filename , data )
		}
		if(opts.dumpjson)
		{
			var filename=plated.files.joinpath( opts.output , output_filename ) + ".json"
			var data=JSON_stringify(chunks,{space:1})
			await plated.files.write( filename , data )
		}
		
	}

/***************************************************************************
--[[#js.plated_output.write_map

	plated_output.write_map()

Output plated.map.json which is a concise map of all chunks for all 
files and directories.

]]*/
	plated_output.write_map=async function()
	{
		if(opts.dumpjson)
		{
			let map={}
			for(let n in plated.paths) { map[n]=plated.paths[n]}
			for(let n in plated.dirs) { map[n]=plated.dirs[n]}
			
			var filename=plated.files.joinpath( opts.output , "plated.map.json" )
			var data=JSON_stringify(map,{space:1})
			await plated.files.write( filename , data )
		}
	}

/***************************************************************************
--[[#js.plated_output.write_all

	plated_output.write_all()

Go through all the remembered chunks and write each one out using 
plated_output.write

]]*/
	plated_output.write_all=async function()
	{
		for( var n in plated.output_chunks )
		{
			var chunks=plated.output_chunks[n]
			await plated_output.write(chunks)
		}
		await plated_output.write_map()
	}

	return plated_output
}
