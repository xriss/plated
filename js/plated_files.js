
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var plated_files={};

// create parent dir if necessary and write data into this file
	plated_files.write = function(filename,data) {
			try { fs.mkdirSync( path.dirname(filename) ); } catch(e){} // ignore errors
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
		if( vv[0]==opts.plated )
		{
			return true
		}
		return false;
	}

// is this filename something we need to run through plated
	plated_files.filename_is_plated=function(fname)
	{
		var vv=path.basename(fname).split(".");
		if( vv.length>2 && vv[ vv.length-2 ]==opts.plated )
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
		if( vv.length>2 && vv[ vv.length-2 ]==opts.plated )
		{
			vv.splice(vv.length-2,1);
			return path.join(d,vv.join("."));
		}
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
					fs.rmdirSync(curPath);
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
//console.log( "+++"+path.join(fname) );
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
		
//		plated.chunks.reset_namespace();
		
		var list=[];
		var rf=function(fn){
			var d=path.dirname(fn);
			if(d==".") { d=""; }
			
			var chunks=plated.dirs[d];
			if( chunks ) { ns.push(chunks); }
			
//console.log("?",d)
			if((d!="")&&(d!=".")&&(d!="/")) { rf(d); } // next dir
		};
		rf(fname)
		
		ns.reverse();
		
		plated.chunks.set_namespace(ns);

//ls(ns)

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
			
			chunks.__plated__=chunks.__plated__||{};
			chunks.__plated__.source=fname;
			chunks.__plated__.output=plated_files.filename_to_output(fname);
			
			plated.chunks.format_chunks( chunks);

			// run chunks through plugins, eg special blog handling
			for(var idx in plated.process_file) { var f=plated.process_file[idx];
				chunks = f( chunks ); // adjust and or output special chunks or files
			}

			if(chunks.__plated__.output) // may have been told not to do the normal thing
			{
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated_files.write( path.join(opts.output,chunks.__plated__.output) , plated.chunks.replace("{"+(fname.split('.').pop())+"}",merged_chunks) );
				plated_files.write( path.join(opts.output,chunks.__plated__.output)+".json" , JSON.stringify(merged_chunks,null,1) );
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
//		ls(opts);

		plated_files.empty_folder(opts.output);

		plated.dirs={};
		
		plated_files.find_dirs(opts.source,"",function(s){
			console.log("DIR\t"+"/"+s)
			
			var chunks=plated_files.base_files_to_chunks(s+"/name.txt");

			chunks.__plated__=chunks.__plated__||{};
			chunks.__plated__.source=s;
			
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

			plated_files.write( path.join(opts.output,d,".json") , JSON.stringify( plated.chunks.merge_namespace({}) ,null,1) );
		}

//ls(plated.dirs);

		plated_files.find_files(opts.source,"",function(s){
				
				if(!plated_files.filename_is_basechunk(s))
				{
					console.log("FILE\t"+"/"+s)
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
					plated_files.build_file(s);
				}

			}
		});
	}

	return plated_files;
};
