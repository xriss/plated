
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

// special chunk names that trigger docs processing

// json settings for the docs
//		_docs_json




// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_plugin_docs.process_dirs=function(dirs){
				
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			
			var chunk=chunks._docs_json;
			if( chunk )
			{
				var docs={}
				
				for(var docdir in chunk.dirs)
				{
					var test=chunk.dirs[docdir]

					plated_files.find_files(opts.source,docdir,function(s){
						for(var x in chunk.ignore) { if(s.indexOf(x)>-1) return; } // ignore paths containing
						if(s.endsWith(test))
						{
							var fname=path.join(opts.source,docdir,s) // the file to process
							var s;
							try { s=fs.readFileSync(fname,'utf8'); } catch(e){}
							if(s)
							{
								var mode="look"
								var name=""
								var lines=[]
								s.split("\n").forEach(function(l){
									if(mode=="look")
									{
										if(l.startsWith("--[[#"))
										{
											var words=l.substring(5).split(/\s+/); // split on whitespace
											name=""
											if( (words[0]) && words[0].match(/^[0-9a-zA-Z_\-\.]+$/) ) // a valid chunk name, 
											{
												name=words[0];
												mode="read"
												lines=[]
											}
										}
									}
									else
									if(mode=="read")
									{
										if(l.startsWith("]]"))
										{
											mode="look"
											docs[name]=plated_chunks.markdown( lines.join("\n") );
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
				
				
				var pages={"":true}
				var list=[]
				for(var name in docs)
				{
//					console.log(timestr()+" DOCS "+"/"+dirname+" #"+name)
					list.push({name:name,html:docs[name]})
					var aa=name.split(".")
					while(aa.length>0)
					{
						pages[ aa.join(".") ]=true
						aa.pop()
					}
				}
				ls(pages)
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
				
				for(var page in pages)
				{
					var fname					
					if(page=="")
					{
						fname=chunks._filename+"/index.html";
					}
					else
					{
						fname=chunks._filename+"/"+page+"/index.html";
					}
					var newchunks={}
					
					plated.files.set_source(newchunks,fname)

					newchunks._list=[];
					for(var i in list)
					{
						var v=list[i]
						if(v.name.startsWith(page))
						{
							newchunks._list.push(v)
						}
					}

					plated.files.prepare_namespace(fname); // prepare merged namespace
					var merged_chunks=plated.chunks.merge_namespace(newchunks);

					merged_chunks._output_filename=plated.files.filename_to_output(fname)
					merged_chunks._output_chunkname="html"
					plated.output.remember_and_write( merged_chunks )

					console.log(timestr()+" DOCS "+fname)
				}
				
				chunks._list=list
			}

		}
				
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
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
