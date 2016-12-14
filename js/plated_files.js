
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var plated_files={};


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
		if( vv.length==2 && vv[0]==opts.plated )
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
console.log( "+++"+path.join(fname) );
				cache[fname]=s;
			}
		}
		return plated.chunks.fill_chunks( cache[fname] , chunks);
	}


// check this directory and all directories above for generic chunks
// build all of these into the current chunk namespace for this file
	plated_files.parent_files_to_chunks=function(fname)
	{
		plated.chunks.reset_namespace();
		
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
			if((d!=".")&&(d!="/")) { rf(d); } // next dir
		};
		rf(fname)

//		ls(fname);
//		ls(list);
		
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
			var chunks=plated_files.parent_files_to_chunks(fname);

			var fname_out=plated_files.filename_to_output(fname);

			try { fs.mkdirSync( path.dirname( path.join(opts.output,fname_out) ) ); } catch(e){}
			
			plated_files.file_to_chunks(opts.source, fname , chunks); // read chunks from this file
//ls(chunks);
			fs.writeFileSync( path.join(opts.output,fname_out) , plated.chunks.replace("{"+(fname.split('.').pop())+"}",chunks) );

			fs.writeFileSync( path.join(opts.output,fname_out)+".json" , JSON.stringify(chunks,null,1) );
		}
		else
		{
			try { fs.mkdirSync( path.dirname( path.join(opts.output,s) ) ); } catch(e){}				
			fs.writeFileSync( path.join(opts.output,fname), fs.readFileSync( path.join(opts.source,fname) ));
		}
	}

// build all files found in the source dir into the output dir 
	plated_files.build=function()
	{
		ls(opts);

		plated_files.empty_folder(opts.output);
		
		plated_files.find_files(opts.source,"",function(s){
				
				if(!plated_files.filename_is_basechunk(s))
				{
					plated_files.build_file(s);
				}
		});
	}

// build all files found in the source dir into the output dir 
	plated_files.watch=function()
	{
		plated_files.build(); // build once

		var as=opts.source.split("/");
		watch.watchTree(opts.source,{},function(f,curr,prev){
			if(typeof f == "object" && prev === null && curr === null) {
			}
			else
			{
				var af=f.split("/");
				for(var i=0;i<as.length;i++)
				{
					if( as[i]==af[0] )
					{
						af.splice(0,1);
					}
				}
				var s=af.join("/");

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
