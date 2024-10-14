
var util=require('util');
var path=require('path');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

exports.create=function(opts,readme){
	readme=readme || {};
	 // allow any custom promise based file system
	readme.pfs=readme.pfs || 	(require("pify"))(require('fs'))
	
// force defaults if they are missing
	opts = opts || {} 

	readme.setup=function(opts)
	{
		opts.dirs=[];		
		for(let i=1 ; i<opts._.length ; i++) // all args are the dirs 
		{
			opts.dirs.push(opts._[i])
		}
	}

	readme.build=async function()
	{
		console.log(opts.dirs)
	}

	readme.setup(opts);
	return readme;
}
