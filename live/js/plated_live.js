
var plated_live=exports;

var loadjs=require("loadjs");

var plated=require("plated").create({"hashchunk":"#^",delimiter:"{}"}) // create a base instance

plated_live.chunks={}
plated.chunks.fill_chunks( require('fs').readFileSync(__dirname + '/chunks.html', 'utf8'), plated_live.chunks )
plated.chunks.fill_chunks( require('fs').readFileSync(__dirname + '/chunks.css', 'utf8'), plated_live.chunks )

plated.plate=function(str){ return plated.chunks.replace(str,plated_live.chunks) }

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


plated_live.start=function(){
	loadjs([
		"lib/jquery.min.js",
		"lib/jquery-ui/jquery-ui.min.js",
		"lib/ace/ace.js",
		"lib/jquery-ui-themes/themes/ui-darkness/jquery-ui.min.css",
		"lib/jquery.splitter.js",
		"lib/jquery.splitter.css",
	],function(){$(plated_live.start_loaded)})
}

plated_live.start_loaded=async function(){
	
	$("html").prepend(plated.plate('<style>{css}</style>')) // load styles
	$("body").empty().append(plated.plate('{body}')) // fill in the base body

	var resize_timeout;
	var resize_func=function(event) {
		var f=function() {
			window.dispatchEvent(new Event('resize'));
		};
		clearTimeout(resize_timeout);
		timresize_timeouteout=setTimeout(f,100);
	};
	$( window ).resize(function() { $("#split").height("100%") }) // keep height full
	$("#split").height("100%").split({orientation:'vertical',limit:5,position:'15%',onDrag: resize_func });
//	$("#split_right").split({orientation:'horizontal',limit:5,position:'90%',onDrag: resize_func });


	plated_live.editor = ace.edit("editor");
	plated_live.editor.setTheme("ace/theme/twilight");
	plated_live.editor.session.setMode("ace/mode/javascript");

//	$( plated.plate("{dialogue_test}") ).dialog();

/*
	var MagicPortal=require("magic-portal")
	var worker = new Worker("js/plated_live_worker.js")
	plated_live.portal = new MagicPortal(worker)

	plated_live.git = await plated_live.portal.get('git')
	plated_live.pfs = await plated_live.portal.get('pfs')

	var t2 = await plated_live.pfs.readdir("/");
	console.log( t2 )
*/

}

