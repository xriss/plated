
var fs = require('fs');
var util=require('util');
var path=require('path');


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
					fs.unlinkSync(curPath);
				}
			});
		}
		else
		{
			try { fs.mkdirSync(path); } catch(e){} // create it
		}
	};
	

// call f with every file we find
	plated_files.find_files = function(root,_path,f) {
		var path = _path ? "/"+_path : "";
		var files=fs.readdirSync(root+path);
		for(var i in files){ var v=files[i];
			if(fs.lstatSync(root+path+"/"+v).isDirectory())
			{
				plated_files.find_files(root,_path ? _path+"/"+v : v,f);
			}
			else
			{
				f(path+"/"+v);
			}
		}
	};

	var cache={}
	plated_files.file_to_chunks=function(root,fname)
	{
		if(!cache[fname])
		{
			var s;
			try { s=fs.readFileSync(root+fname,'utf8'); } catch(e){}
			if(s)
			{
				cache[fname]=plated.chunks.fill_chunks(s);
			}
		}
		return cache[fname];
	}

	return plated_files;
};
