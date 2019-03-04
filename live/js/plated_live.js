
var plated_live=exports;

var plated=require("plated").create({"hashchunk":"#^"}) // create a base instance

plated_live.chunks={}
plated.chunks.fill_chunks( require('fs').readFileSync(__dirname + '/chunks.html', 'utf8'), plated_live.chunks )


plated_live.worker=async function(){

	var MagicPortal=require("magic-portal")
	var portal = new MagicPortal(self);

	var git=require("isomorphic-git")

	var fs=new (require("@isomorphic-git/lightning-fs"))('plated')
	var pfs=(require("pify"))(fs)
	
	git.plugins.set('fs', fs)

	await git.clone({
		dir: '/',
		corsProxy: 'https://cors.isomorphic-git.org',
		url: 'https://github.com/isomorphic-git/isomorphic-git',
		ref: 'master',
		singleBranch: true,
		depth: 10
	})


	portal.set('git', git)
	portal.set('pfs', pfs)

}


plated_live.start=async function(){

	console.log(plated_live.chunks)

	var MagicPortal=require("magic-portal")
	var worker = new Worker("js/plated_live_worker.js")
	plated_live.portal = new MagicPortal(worker)

	plated_live.git = await plated_live.portal.get('git')
	plated_live.pfs = await plated_live.portal.get('pfs')

	var t2 = await plated_live.pfs.readdir("/");
	console.log( t2 )
	
}

