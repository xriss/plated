
var plated_live=exports;

var pify=require("pify")
var git=require("isomorphic-git")


var test=async function(){
	
	plated_live.fs=new (require("@isomorphic-git/lightning-fs"))('plated')
	plated_live.pfs=pify(plated_live.fs)
	
	git.plugins.set('fs', plated_live.fs)


	console.log(plated_live.pfs)

	var t = await plated_live.pfs.readdir("/");
	console.log( t )

	await git.clone({
	  dir: '/',
	  corsProxy: 'https://cors.isomorphic-git.org',
	  url: 'https://github.com/isomorphic-git/isomorphic-git',
	  ref: 'master',
	  singleBranch: true,
	  depth: 10
	})

	var t2 = await plated_live.pfs.readdir("/");
	console.log( t2 )

}

test()
