

/***************************************************************************
--[[#js.plated_plugin.import

A way of importing chunks from another page.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	import plated_plugin_import_create from "./plated_plugin_import.js"
	let plated_plugin_import=await plated_create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

]]*/

/***************************************************************************
--[[#html.plated_plugin.import

	#^importedchunk import=dir/dir
	...
	
The content if this chunk is unimportant as it will be replaced by the 
chunk referenced from another file via the import=dir flag. 

]]*/


import util from 'node:util'
import path from 'node:path'
import djon from '@xriss/djon'


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
export default async function plated_plugin_import_create(opts,plated){

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

		for( let n in chunks )
		{
			var flags=chunks._flags && chunks._flags[n]
			if(flags && flags.import) // special import 
			{
				var dirname=flags.import
				var dirchunks=plated.dirs[dirname] || plated.paths[dirname]
				if( dirname && dirchunks )
				{
					chunks[n]=dirchunks
					console.log(timestr()+" IMPORTING from "+dirname+" into #^"+n)
				}
			}
		}
		return chunks;
	};


	return plated_plugin_import;
};
