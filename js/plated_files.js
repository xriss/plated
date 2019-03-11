
/***************************************************************************
--[[#js.plated_files

Manage the files that we read from and watch or write to.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_files = require("./plated_files.js").create(opts,plated)

This is called automatically when the plated module is created and the 
return value is made available in plated.chunks note that all of these 
modules are bound together and operate as a group with shared data.

In the future when we talk about this module and its available 
functions we are referring to the return value from this create 
function.

]]*/


//var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');
var JSON_stringify = require('json-stable-stringify');

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){
	
	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_files={};

/***************************************************************************
--[[#js.plated_files.exists

	await plated_files.exists(path)

Returns true if a file or dir at the given path exists.

]]*/
	plated_files.exists = async function(dir)
	{
		if( await plated.pfs.stat(dir).catch(e=>{}) )
		{
			return true
		}
		return false
	}

/***************************************************************************
--[[#js.plated_files.mkdir

	plated_files.mkdir(dir)

Create the given dir and recursively create its parent dirs as well if 
necessary.

]]*/
	plated_files.mkdir = async function(dir)
	{
//		if(dir==".") { return }

		if( await plated.pfs.stat(dir).catch(e=>{}) ) { return } // already done

		await plated.pfs.mkdir(dir).catch(e=>{}) // create dir

		if( await plated.pfs.stat(dir).catch(e=>{}) ) { return } // success

		var parent=path.dirname(dir)
		if(parent && parent!=dir) // sanity
		{
			await plated_files.mkdir(parent) //create parent dir
		}
		await plated.pfs.mkdir(dir) // try and create dir again but do not catch error		
	}

/***************************************************************************
--[[#js.plated_files.mkdir

	plated_files.mkdir(dir)

Fill in _source and related chunks such as.

_sourcename the file that this set of chunks came from.

_filename the output filename.

_dirname the output dirname.

_root the root of the site, normally a relative path to the current 
directory, eg ../ since some things such as github pages need to exist 
in a directory rather than the root of a site. This should always be 
used in html paths, {_root} instead of / to make sure that you always 
get to the right place and can find your files.

_filename the url path of the filename, eg /dirname/filename

_dirname the url path of the dir this file exists in, eg /dirname

]]*/
	plated_files.set_source=function(chunks,source)
	{
		chunks._sourcename=plated_files.filename_fixup(source);

		chunks._filename=plated_files.filename_to_output(chunks._sourcename);

		chunks._dirname=plated_files.filename_to_dirname(chunks._sourcename);
		
		if(opts.site)
		{
			chunks._site=opts.site;
		}
		else
		{
			chunks._site="{_root}"
		}
		
		if(opts.root)
		{
			chunks._root=opts.root;
		}
		else // work out relative path
		{
			var depth=chunks._dirname.split("/").length
			if(chunks._dirname=="")
			{
				chunks._root="./";
			}
			else
			{
				chunks._root=""
				while(depth>0)
				{
					chunks._root+="../"
					depth--
				}
			}
		}
		chunks._filename="{_root}"+chunks._filename;
		chunks._dirname="{_root}"+chunks._dirname;

		return chunks;
	}

/***************************************************************************
--[[#js.plated_files.write

	plated_files.write(filename,data)

Create parent dir if necessary and write the data into this file.

]]*/
	plated_files.write = async function(filename,data)
	{
		await plated_files.mkdir( path.dirname(filename) );
		await plated.pfs.writeFile( filename , data );
	};

/***************************************************************************
--[[#js.plated_files.filename_fixup

	filename = plated_files.filename_fixup(filename)

Fix the filename, so it becomes an empty string rather than a "." or 
"/." or "/" this makes it easier to use in urls.

]]*/
	plated_files.filename_fixup = function(filename) {
		if( filename =="." ) { filename =""; }
		if( filename =="/." ) { filename =""; }
		if( filename =="/" ) { filename =""; }
		return filename;
	}

/***************************************************************************
--[[#js.plated_files.filename_to_dirname

	dirname = plated_files.filename_to_dirname(filename)

Get the dirname of this filename.

]]*/
	plated_files.filename_to_dirname = function(filename) {
		return plated_files.filename_fixup(path.dirname(filename));
	}


/***************************************************************************
--[[#js.plated_files.source_to_output

	filename = plated_files.source_to_output(filename)

Convert a source path into an output path.

]]*/
	plated_files.source_to_output = function(path) {
		var ps=path.replace(opts.source,opts.output);
		if( ps.startsWith(opts.output) ) { return ps; }
		return null;
	};

/***************************************************************************
--[[#js.plated_files.filename_is_basechunk

	bool = plated_files.filename_is_basechunk(filename)

Is this filename part of the basechunks for a dir?

A base chunk is something like ^.html or ^.css all of these files get 
merged into the base chunks for the directory they are found in. Their 
extension is ignored and just to help syntax highlighting when the file 
is viewed.

]]*/
	plated_files.filename_is_basechunk=function(fname)
	{
		var vv=path.basename(fname).split(".");
		if( (vv.length>1) && (vv[0]==opts.hashfile) )
		{
			return true
		}
		return false;
	}

/***************************************************************************
--[[#js.plated_files.filename_is_plated

	bool = plated_files.filename_is_plated(filename)
 
Is this filename something we need to run through plated. Returns true 
if filename contains the ^ trigger string. This string can be changed 
by altering opts.hashfile from "^" to something else.

]]*/
	plated_files.filename_is_plated=function(fname)
	{
		var vv=path.basename(fname).split(".");
		if( vv.length>2 && vv[ vv.length-2 ]==opts.hashfile )
		{
			return true
		}
		return false;
	}

/***************************************************************************
--[[#js.plated_files.filename_to_output

	filename = plated_files.filename_to_output(filename)
 
Work out the output filename from an input filename, the trigger string 
"^." gets removed as we process a file.

]]*/
	plated_files.filename_to_output=function(fname)
	{
		var d=path.dirname(fname);
		var vv=path.basename(fname).split(".");
		for(var i=vv.length-1;i>0;i--)
		{
			if( vv[i] == opts.hashfile )
			{
				vv.splice(i,1);
			}
		}
		return plated_files.filename_fixup( path.join(d,vv.join(".")) );
	}

/***************************************************************************
--[[#js.plated_files.empty_folder

	plated_files.empty_folder(path)
 
Empty the (output) folder or make it if it does not exist. This is 
rather dangerous so please be careful.

]]*/
	plated_files.empty_folder = async function(path) {
	var ttt=await plated_files.exists(path)
		if( await plated_files.exists(path) )
		{
			var files = await plated.pfs.readdir(path);
			for(var index=0 ; index<files.length ; index++ )
			{
				var file=files[index]
				var curPath = path + "/" + file;
				var st=await plated.pfs.lstat(curPath)
				if( st.isDirectory() )
				{
					await plated_files.empty_folder(curPath);
				}
				else
				{
					if(file!=".git") // dont delete .git files // TODO:make generic rule? We need t keep .git for submodules
					{
						await plated.pfs.unlink(curPath);
					}
				}
			}
		}
		else
		{
			await plated.pfs.mkdir(path).catch(e=>{}) // create it
//			try { fs.mkdirSync(path); } catch(e){} // create it
		}
	};
	

/***************************************************************************
--[[#js.plated_files.find_files

	plated_files.find_files(root,name)
 
REturn an array with every file we find inside the root/name directory. 
We follow symlinks into other directories.

]]*/
	plated_files.find_files = async function(root,name,ret)
	{
		ret=ret || []
		var files=await plated.pfs.readdir( path.join(root,name) );
		for(var i in files){ var v=files[i];
			var st=await plated.pfs.stat( path.join(root,name,v) ); // follow links
			if( st.isDirectory() )
			{
				await plated_files.find_files(root,path.join(name,v),ret);
			}
			else
			{
				ret.push( path.join(name,v) )
			}
		}
		return ret
	};

/***************************************************************************
--[[#js.plated_files.find_dirs

	plated_files.find_dirs(root,name,func)
 
Call func(name) with every directory we find inside the root/name 
directory. We follow symlinks into other directories.

]]*/
	plated_files.find_dirs = async function(root,name,ret)
	{
		ret=ret || []
		ret.push( name )
		var files=await plated.pfs.readdir( path.join(root,name) );
		for(var i in files){ var v=files[i];
			var st=await plated.pfs.stat( path.join(root,name,v) ); // follow links
			if( st.isDirectory() )
			{
				await plated_files.find_dirs(root,path.join(name,v),ret);
			}
		}
		return ret
	};

	var cache={}

/***************************************************************************
--[[#js.plated_files.empty_cache

	plated_files.empty_cache()
 
Empty the current file cache, we fill it up as read files.

]]*/
	plated_files.empty_cache=function()
	{
		cache={};
	}

/***************************************************************************
--[[#js.plated_files.file_to_chunks

	chunks = plated_files.file_to_chunks(root,fname,chunks)
 
Load root/fname or get it from the cache and then turn it into chunks 
using plated_chunks.fill_chunks(date,chunks) chunks is returned.

]]*/
	plated_files.file_to_chunks=async function(root,fname,chunks)
	{
		if(!cache[fname])
		{
			var s=await plated.pfs.readFile(path.join(root,fname),'utf8').catch(e=>{})
			if(s)
			{
				cache[fname]=s;
			}
		}
		return plated.chunks.fill_chunks( cache[fname] , chunks);
	}


/***************************************************************************
--[[#js.plated_files.prepare_namespace

	plated_files.prepare_namespace(fname)
 
Check this directory and all directories above for generic chunks then 
build all of these into the current chunk namespace for this file.

]]*/
	plated_files.prepare_namespace=function(fname)
	{
		var ns=[];
		
		var list=[];
		var rf=function(fn){
			var d=path.dirname(fn);
			if(d==".") { d=""; }
			
			var chunks=plated.dirs[d];
			if( chunks ) { ns.push(chunks); }
			
			if((d!="")&&(d!=".")&&(d!="/")) { rf(d); } // next dir
		};
		rf(fname)
		
		ns.reverse();
		
		plated.chunks.set_namespace(ns);

	}

/***************************************************************************
--[[#js.plated_files.base_files_to_chunks

	chunks = await plated_files.base_files_to_chunks(fname)
 
Check this directory and all directories above for generic chunks build 
all of these into the current chunk namespace for this file.

]]*/
	plated_files.base_files_to_chunks=async function(fname)
	{
		var list=[];
		var d=path.dirname(fname);
		var p=path.join(opts.source,d);
		var files=await plated.pfs.readdir(p);
		files.sort();
		files.reverse();
		for(var i in files){ var v=files[i];
			if( plated_files.filename_is_basechunk(v) )
			{
				var p2=path.join(d,v);
				list.push(p2);
			}
		}
		
		var chunks={};
		for(var i=list.length-1 ; i>=0 ; i--) { var v=list[i];
			await plated_files.file_to_chunks(opts.source,v,chunks);
		}
		return chunks;
	}

/***************************************************************************
--[[#js.plated_files.build_file

	plated_files.build_file(fname)
 
Build the given source filename, using chunks or maybe just a raw copy 
from source into the output.

]]*/
	plated_files.build_file=async function(fname)
	{
		if(plated_files.filename_is_plated(fname))
		{
			var output_filename = path.join( opts.output , plated.files.filename_to_output(fname) );
			
			plated_files.prepare_namespace(fname); // prepare merged namespace
			
			var chunks={};
			
			await plated_files.file_to_chunks(opts.source, fname , chunks); // read chunks from this file
			
			plated_files.set_source(chunks,fname)
			
			plated.chunks.format_chunks( chunks);

			// run chunks through plugins, eg special blog handling
			for(var idx in plated.process_file) { var f=plated.process_file[idx];
				chunks = await f( chunks ); // adjust and or output special chunks or files
			}

			var merged_chunks=plated.chunks.merge_namespace(chunks);
			
			merged_chunks._output_filename=plated.files.filename_to_output(fname)
			merged_chunks._output_chunkname=fname.split('.').pop()
			await plated.output.remember_and_write( merged_chunks )

		}
		else
		{
			var s=await plated.pfs.readFile( path.join(opts.source,fname) ).catch(e=>{})
			if(s!==null)
			{
				await plated_files.write( path.join(opts.output,fname), s );
			}
		}
	}

/***************************************************************************
--[[#js.plated_files.build

	plated_files.build()
 
Build all files found in the source dir into the output dir.

]]*/
	plated_files.build=async function()
	{
		await plated_files.empty_folder(opts.output);

		plated.dirs={};
		
		var dirs = await plated_files.find_dirs(opts.source,"")
		for(var i in dirs){ var s=dirs[i]
			console.log(timestr()+" DIR  "+"/"+s)
			
			var chunks=await plated_files.base_files_to_chunks(s+"/name.txt");

			plated_files.set_source(chunks,s+"/.")
			
			plated.chunks.format_chunks( chunks );

			// run chunks through plugins, eg special blog handling
			for(var idx in plated.process_file) { var f=plated.process_file[idx];
				chunks = await f( chunks ); // adjust and or output special chunks or files
			}

			plated.dirs[s]=chunks;
		}

		// run chunks through plugins, eg special blog handling
		for(var idx in plated.process_dirs) { var f=plated.process_dirs[idx];
			plated.dirs = await f( plated.dirs ); // adjust and or output special chunks or files

		}


		for(var d in plated.dirs){ var chunks=plated.dirs[d];

			plated_files.prepare_namespace( path.join(d,".json") ); // prepare merged namespace
			var merged_chunks=plated.chunks.merge_namespace({});

			merged_chunks._output_filename=d+"/"
			merged_chunks._output_chunkname=undefined
			await plated.output.remember_and_write( merged_chunks )

		}

		var files=await plated_files.find_files(opts.source,"")
		for(var i in files){ var s=files[i]
			if(!plated_files.filename_is_basechunk(s))
			{
				console.log(timestr()+" FILE "+"/"+s)
				await plated_files.build_file(s);
			}
		}

		await plated.output.write_all()
	}

/***************************************************************************
--[[#js.plated_files.watch

	plated_files.watch()
 
Build all files found in the source dir into the output dir and then 
sit watching for changes to these files that would trigger rebuilds.

This does not return, instead the user is expected to ctrl+c when 
finished.


]]*/
	plated_files.watch=async function()
	{
		await plated_files.build(); // build once

		var rebuild=false; // set to true to request a rebuild

		var as=opts.source.split(path.sep);
		watch.watchTree(opts.source,{},async function(f,curr,prev){
			if(typeof f == "object" && prev === null && curr === null)
			{
				// finished
			}
			else
			if(!curr) // Probably a temp file blinked into existence and is now gone.
			{
			}
			else
			if(curr.nlink===0) // f was removed
			{
				rebuild=true
			}
			else
			if(prev === null) // f is a new file
			{
				rebuild=true
			}
			else
			{
				flag=true;
				var af=f.split(path.sep);
				for(var i=0;i<as.length;i++)
				{
					if( as[i]==af[0] )
					{
						af.splice(0,1);
					}
				}
				var s=af.join(path.sep);

				plated_files.empty_cache();
				if(plated_files.filename_is_basechunk(s)) // full build
				{
					rebuild=true
				}
				else
				{
					console.log(timestr()+" FILE "+"/"+s)
					await plated_files.build_file(s);
				}

			}
		});
		setInterval(function(){
			if(rebuild)
			{
				rebuild=false
				plated_files.build();
			}
		},1000)
	}

	return plated_files;
};
