
/***************************************************************************
--[[#js.plated_plugin.docs

A docs plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_docs = require("./plated_plugin_docs.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

]]*/

/***************************************************************************
--[[#html.plated_plugin.docs

	#^_docs_json
	{
		ignore:{
			"node_modules":true,
		},
		dirs:{
			"../js":".js",
		},
	}

A chunk of this name must be created in a directory scope file for this 
plugin to parse it. We should ignore any paths containing the key 
strings in the ignore object and will include (recursively) the keys in 
the dirs object but only if the filename ends in the given string.

So in the above case we will scan ../js for all .js files but ignore 
everything in node_modules. One should always ignore everything in 
node_modules.

These files are searched for special auto doc documentation syntax 
where any line that begins with --[#name.of.the.chunk will begin a 
special documentation chunk and ]] will end it. In both cases the 
string must be at the start of a line.

Each of these chunks will then be rendered into its own page as well as 
its parent pages, we use dot notation to describe this relationship. In 
the case of name.of.the.chunk it will exist in name.of.the name.of name 
and the always present /

Take a look at the source code that generates this site documentation 
in source/docs for an example of how this can be themed and presented.

]]*/

var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){
	
	var plated_chunks=plated.chunks
	var plated_files=plated.files

	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_plugin_docs={};
	
	
	plated_plugin_docs.config={};
	
// configurable triggers, these must both be at the start of a line
// and defaults to lua style comments

	plated_plugin_docs.config.head="--[[#"
	plated_plugin_docs.config.foot="]]"

// special chunk names that trigger docs processing

// json settings for the docs
//		_docs_json




/***************************************************************************
--[[#js.plated_plugin.docs.process_dirs

	dirs = plated_plugin_docs.process_dirs(dirs)

Tweak all the base chunks grouped by dir name and pre cascaded/merged

]]*/
	plated_plugin_docs.process_dirs=function(dirs){
				
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			
			var chunk=chunks._docs_json;
			if( chunk )
			{
				chunk.dirname=chunks._dirname // remember the root dirname
				var docs={}
				
				for(var docdir in chunk.dirs)
				{
					var test=chunk.dirs[docdir]

					plated_files.find_files(path.join(opts.source,docdir),"",function(fn){
						for(var x in chunk.ignore) { if(fn.indexOf(x)>-1) return; } // ignore paths containing
						if(fn.endsWith(test))
						{
							var fname=path.join(opts.source,docdir,fn) // the file to process
							var s;
							try { s=fs.readFileSync(fname,'utf8'); } catch(e){}
							if(s)
							{
								var mode="look"
								var name=""
								var lines=[]
								var idx=0
								var linenum=0
								s.split("\n").forEach(function(l){
									idx++
									if(mode=="look")
									{
										if(l.startsWith(plated_plugin_docs.config.head))
										{
											var words=l.substring(plated_plugin_docs.config.head.length).split(/\s+/); // split on whitespace
											name=""
											if( (words[0]) && words[0].match(/^[0-9a-zA-Z_\-\.]+$/) ) // a valid chunk name, 
											{
												name=words[0];
												mode="read"
												lines=[]
												linenum=idx
											}
										}
									}
									else
									if(mode=="read")
									{
										if(l.startsWith(plated_plugin_docs.config.foot))
										{
											mode="look"
											docs[name]={
												name:name,
												body:plated_chunks.markdown( lines.join("\n") ),
												line:linenum,
												file:fname,
											};
										}
										else
										{
											lines[lines.length]=l
										}
									}
								})
							}
						}
					});

				}
				
				var names={}
				for(var name in docs) // first cache
				{
					names[name]=true
				}
				for(var name in names) // then modify
				{
					var aa=name.split(".")
					while(aa.length>0)
					{
						var n=aa.join(".")
						if(!docs[n])
						{
							docs[n]={ // fill in parents
								name:n,
								body:"",
							}
						}
						aa.pop()
					}
				}
				
				var pages={"":0}
				var list=[]
				for(var name in docs)
				{
//					console.log(timestr()+" DOCS "+"/"+dirname+" #"+name)
					list.push(docs[name])
					var aa=name.split(".")
					while(aa.length>0)
					{
						var n=aa.join(".")
						pages[n]=(pages[n]||0)+1 // count
						aa.pop()
					}
					pages[""]++ // all count
				}

				list.sort( function(aa,bb){
					var a=aa.name
					var b=bb.name
  					if(a.length<b.length)
					{
						if(a < b.substring(0,a.length) ) return -1
						if(a > b.substring(0,a.length) ) return  1
						return -1
					}
					else
					if(a.length>b.length)
					{
						if(a.substring(0,b.length) < b) return -1
						if(a.substring(0,b.length) > b) return  1
						return 1
					}
					else
					{
						if(a < b) return -1
						if(a > b) return  1
						return 0
					}

				} )
				
				chunks._list=list
				chunks._docs=[]; // list of all available docs and their counts
				for(var i in list)
				{
					list[i].count=pages[ list[i].name ]
					chunks._docs.push( { name:list[i].name , count:list[i].count } )
				}


				for(var page in pages)
				{
					var fname					
					if(page=="")
					{
						fname=plated_files.filename_to_dirname(chunks._sourcename)+"/index.html";
					}
					else
					{
						fname=plated_files.filename_to_dirname(chunks._sourcename)+"/"+page+"/index.html";
					}
					var newchunks={}
					
					plated_files.set_source(newchunks,fname)

					newchunks._list=[];
					for(var i in list)
					{
						var v=list[i]
						if( v.name.startsWith(page+".") || v.name==page || page=="" ) 
						{
							newchunks._list.push(v)
						}
					}

					plated_files.prepare_namespace(fname); // prepare merged namespace
					var merged_chunks=plated_chunks.merge_namespace(newchunks);

					merged_chunks._output_filename=plated_files.filename_to_output(fname)
					merged_chunks._output_chunkname="html"
					plated.output.remember_and_write( merged_chunks )

					console.log(timestr()+" DOCS "+fname)
				}
				
			}

		}
				
		return dirs;
	};


/***************************************************************************
--[[#js.plated_plugin.docs.process_file

	chunks = plated_plugin_docs.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be available.

]]*/
	plated_plugin_docs.process_file=function(chunks){
		
// process _docs_json
		var chunk=chunks._docs_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			
			chunks._docs_json=chunk;
		}		
		
		return chunks;
	};


	return plated_plugin_docs;
};
