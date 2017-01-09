
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');
var JSON_stringify = require('json-stable-stringify');

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){
	
	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_files={};

	plated_files.mkdir = function(dir){
		if (fs.existsSync(dir)){
			return
		}

		try{
			fs.mkdirSync(dir)
		}catch(err){
			if(err.code == 'ENOENT'){
				plated_files.mkdir(path.dirname(dir)) //create parent dir
				plated_files.mkdir(dir) //create dir
			}
		}
	}

// fill in _source and related chunks
	plated_files.set_source=function(chunks,source)
	{
		chunks._filename=plated.files.filename_to_output(source);
		if( chunks._filename=="/" ) { chunks._filename=""; }
		chunks._dirname=path.dirname(source);
		if( chunks._dirname =="." ) { chunks._dirname =""; }
		if( chunks._dirname =="/" ) { chunks._dirname =""; }
		
		chunks._root=opts.root;
//		chunks._filename=opts.root+chunks._filename;
//		chunks._dirname=opts.root+chunks._dirname;
		
		return chunks;
	}

// create parent dir if necessary and write data into this file
	plated_files.write = function(filename,data) {
		plated_files.mkdir( path.dirname(filename) );
		fs.writeFileSync( filename , data );
	};

// convert a source path into an output path
	plated_files.source_to_output = function(path) {
		var ps=path.replace(opts.source,opts.output);
		if( ps.startsWith(opts.output) ) { return ps; }
		return null;
	};

// is this filename part of the basechunks for a dir
	plated_files.filename_is_basechunk=function(fname)
	{
		var vv=path.basename(fname).split(".");
		if( vv[0]==opts.hashfile )
		{
			return true
		}
		return false;
	}

// is this filename something we need to run through plated
	plated_files.filename_is_plated=function(fname)
	{
		var vv=path.basename(fname).split(".");
		if( vv.length>2 && vv[ vv.length-2 ]==opts.hashfile )
		{
			return true
		}
		return false;
	}

// output filename
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
		return path.join(d,vv.join("."));
	}

// empty the (output) folder or make it if it does not exist
	plated_files.empty_folder = function(path) {
		var files = [];
		if( fs.existsSync(path) ) {
			files = fs.readdirSync(path);
			files.forEach(function(file,index){
				var curPath = path + "/" + file;
				if(fs.lstatSync(curPath).isDirectory()) { // recurse
					plated_files.empty_folder(curPath);
				} else { // delete file
					if(file!=".git") // dont delete .git files
					{
						fs.unlinkSync(curPath);
					}
				}
			});
		}
		else
		{
			try { fs.mkdirSync(path); } catch(e){} // create it
		}
	};
	

// call f with every file we find
	plated_files.find_files = function(root,name,f) {
		var files=fs.readdirSync( path.join(root,name) );
		for(var i in files){ var v=files[i];
			if(fs.lstatSync( path.join(root,name,v) ).isDirectory())
			{
				plated_files.find_files(root,path.join(name,v),f);
			}
			else
			{
				f( path.join(name,v) );
			}
		}
	};

// call f with every dir we find
	plated_files.find_dirs = function(root,name,f) {
		f(name);
		var files=fs.readdirSync( path.join(root,name) );
		for(var i in files){ var v=files[i];
			if(fs.lstatSync( path.join(root,name,v) ).isDirectory())
			{
				plated_files.find_dirs(root,path.join(name,v),f);
			}
		}
	};

	var cache={}

	plated_files.empty_cache=function()
	{
		cache={};
	}

	plated_files.file_to_chunks=function(root,fname,chunks)
	{
		if(!cache[fname])
		{
			var s;
			try { s=fs.readFileSync(path.join(root,fname),'utf8'); } catch(e){}
			if(s)
			{
				cache[fname]=s;
			}
		}
		return plated.chunks.fill_chunks( cache[fname] , chunks);
	}


// check this directory and all directories above for generic chunks
// build all of these into the current chunk namespace for this file
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

// check this directory and all directories above for generic chunks
// build all of these into the current chunk namespace for this file
	plated_files.base_files_to_chunks=function(fname)
	{
		var list=[];
		var rf=function(fn){
			var d=path.dirname(fn);
			var p=path.join(opts.source,d);
			var files=fs.readdirSync(p);
			files.sort();
			files.reverse();
			for(var i in files){ var v=files[i];
				if( plated_files.filename_is_basechunk(v) )
				{
					var p2=path.join(d,v);
					list.push(p2);
				}
			}
		};
		rf(fname)
		
		var chunks={};
		for(var i=list.length-1 ; i>=0 ; i--) { var v=list[i];
			plated_files.file_to_chunks(opts.source,v,chunks);
		}
		return chunks;
	}

// build the given source filename, using chunks or maybe just a raw copy
	plated_files.build_file=function(fname)
	{
		if(plated_files.filename_is_plated(fname))
		{
			plated_files.prepare_namespace(fname); // prepare merged namespace
			
			var chunks={};
			
			plated_files.file_to_chunks(opts.source, fname , chunks); // read chunks from this file
			
			plated_files.set_source(chunks,fname)
			
			plated.chunks.format_chunks( chunks);

			// run chunks through plugins, eg special blog handling
			for(var idx in plated.process_file) { var f=plated.process_file[idx];
				chunks = f( chunks ); // adjust and or output special chunks or files
			}

			if(chunks._filename) // may have been told not to do the normal thing
			{
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated_files.write( path.join(opts.output,chunks._filename) , plated.chunks.replace( plated.chunks.delimiter_wrap_str(fname.split('.').pop()),merged_chunks) );
				if(opts.dumpjson){
					plated_files.write( path.join(opts.output,chunks._filename)+".json" , JSON_stringify(merged_chunks,{space:1}) );
				}
			}

		}
		else
		{
			plated_files.write( path.join(opts.output,fname), fs.readFileSync( path.join(opts.source,fname) ));
		}
	}

// build all files found in the source dir into the output dir 
	plated_files.build=function()
	{

		plated_files.empty_folder(opts.output);

		plated.dirs={};
		
		plated_files.find_dirs(opts.source,"",function(s){
			console.log(timestr()+" DIR  "+"/"+s)
			
			var chunks=plated_files.base_files_to_chunks(s+"/name.txt");

			plated_files.set_source(chunks,s+"/.")
			
			plated.chunks.format_chunks( chunks );

			// run chunks through plugins, eg special blog handling
			for(var idx in plated.process_file) { var f=plated.process_file[idx];
				chunks = f( chunks ); // adjust and or output special chunks or files
			}

			plated.dirs[s]=chunks;
		});

		// run chunks through plugins, eg special blog handling
		for(var idx in plated.process_dirs) { var f=plated.process_dirs[idx];
			plated.dirs = f( plated.dirs ); // adjust and or output special chunks or files
		}


		for(var d in plated.dirs){ var chunks=plated.dirs[d];

			plated_files.prepare_namespace( path.join(d,".json") ); // prepare merged namespace
			if(opts.dumpjson){
				plated_files.write( path.join(opts.output,d,".json") , JSON_stringify( plated.chunks.merge_namespace({}) ,{space:1}) );
			}
		}

		plated_files.find_files(opts.source,"",function(s){
				
				if(!plated_files.filename_is_basechunk(s))
				{
					console.log(timestr()+" FILE "+"/"+s)
					plated_files.build_file(s);
				}
		});
	}

// build all files found in the source dir into the output dir 
	plated_files.watch=function()
	{
		plated_files.build(); // build once

		var as=opts.source.split(path.sep);
		watch.watchTree(opts.source,{},function(f,curr,prev){
			if(typeof f == "object" && prev === null && curr === null) {
			}
			else
			{
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
					plated_files.build();
				}
				else
				{
					console.log(timestr()+" FILE "+"/"+s)
					plated_files.build_file(s);
				}

			}
		});
	}

	return plated_files;
};
