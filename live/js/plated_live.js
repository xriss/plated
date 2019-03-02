
var plated_live=exports;

var pify=require("pify")
var git=require("isomorphic-git")


var test=async function(){
	
	plated_live.fs=new (require("@isomorphic-git/lightning-fs"))('plated')
	plated_live.pfs=pify(plated_live.fs)

	console.log(plated_live.pfs)

	var t = await plated_live.pfs.readdir("/");

	console.log( t )

}

test()
