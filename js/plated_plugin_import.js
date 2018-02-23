

/***************************************************************************
--[[#js.plated_plugin.import

A way of importing chunks from another page.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_import = require("./plated_plugin_import.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

]]*/

/***************************************************************************
--[[#html.plated_plugin.import

	#^importedchunk import=dir/dir#chunkname
	...
	
The content if this chunk is unimportant as it will be replaced by the chunk referenced from another file via import=dir#chunkname

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

	var plated_plugin_import={};
		
	plated_plugin_import.config={};

/***************************************************************************
--[[#js.plated_plugin.import.process_file

	chunks = plated_plugin_import.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be 
available.

]]*/
	plated_plugin_import.process_file=function(chunks){
		
// process import flag

		for( n in chunks )
		{
			var flags=chunks._flags && chunks._flags[n]
			if(flags && flags.import) // special import 
			{
				var aa=flags.import.split("^")
				var dirname=aa[0]
				var chunkname=aa[1]
				var dirchunks=plated.dirs[dirname] || plated.files[dirname]
				if( dirname && chunkname && dirchunks && dirchunks[chunkname] )
				{
					chunks[n]=dirchunks[chunkname]
					console.log(timestr()+" IMPORTING #^"+chunkname+" from "+dirname+" into #^"+n)
for( var n in plated.dirs){ console.log(n) }
				}
			}
		}
		return chunks;
	};


	return plated_plugin_import;
};
