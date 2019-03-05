
var plated_live=exports;

var loadjs=require("loadjs");

var plated=require("plated").create({"hashchunk":"#^",delimiter:"{}"}) // create a base instance

plated_live.chunks={}
plated.chunks.fill_chunks( require('fs').readFileSync(__dirname + '/chunks.html', 'utf8'), plated_live.chunks )
plated.chunks.fill_chunks( require('fs').readFileSync(__dirname + '/chunks.css', 'utf8'), plated_live.chunks )

plated.plate=function(str){ return plated.chunks.replace(str,plated_live.chunks) }

plated_live.git_setup=async function(){
	var fs=new (require("@isomorphic-git/lightning-fs"))('plated',{})
	plated_live.git=require("isomorphic-git")
	plated_live.git.plugins.set('fs', fs)
	plated_live.pfs=(require("pify"))(fs)

	plated_live.emitter = new (require('events'))
	plated_live.git.plugins.set('emitter', plated_live.emitter)
	plated_live.emitter.on('message', message => {
		console.log(message)
	})

}

plated_live.worker=async function(){

	var MagicPortal=require("magic-portal")
	var portal = new MagicPortal(self);

	plated_live.git_setup()
	
	portal.set('git', plated_live.git)
	portal.set('pfs', plated_live.pfs)
//	portal.set('emitter', plated_live.emitter)


}

plated_live.opts={}

plated_live.opts.noworker=false

plated_live.start=function(opts){
	plated_live.opts=plated_live.opts || opts
	
	loadjs([
		"lib/jquery.min.js",
		"lib/jquery-ui/jquery-ui.min.js",
		"lib/ace/ace.js",
		"lib/jquery-ui-themes/themes/ui-darkness/jquery-ui.min.css",
		"lib/jquery.splitter.js",
		"lib/jquery.splitter.css",
		"lib/jquery.terminal.min.js",
		"lib/jquery.terminal.min.css",
	],function(){$(plated_live.start_loaded)})
}

plated_live.cmds={}
plated_live.cmds.add=function(a,b){ this.echo(a + b); }

plated_live.start_loaded=async function(){
	
	$("html").prepend(plated.plate('<style>{css}</style>')) // load styles
	$("body").empty().append(plated.plate('{body}')) // fill in the base body

	var resize_timeout;
	var resize_func=function(event) {
		var f=function() {
			$("#split").height("100%")
			$("#split_left").height("100%")
			$("#split_right").height("100%")
			window.dispatchEvent(new Event('resize'));
		};
		clearTimeout(resize_timeout);
		timresize_timeouteout=setTimeout(f,100);
	};
	$( window ).resize(resize_func) // keep height full
	$("#split").height("100%").split({orientation:'vertical',limit:5,position:'15%',onDrag: resize_func });
	$("#split_left").split({orientation:'horizontal',limit:5,position:'90%',onDrag: resize_func });
//	$("#split_right").split({orientation:'horizontal',limit:5,position:'90%',onDrag: resize_func });

	$('#menubar').menu({
		position: { my: 'left top', at: 'left bottom' },
		blur: function() {
			$(this).menu('option', 'position', { my: 'left top', at: 'left bottom' });
		},
		focus: function(e, ui) {
			if ($('#menubar').get(0) !== $(ui).get(0).item.parent().get(0)) {
				$(this).menu('option', 'position', { my: 'left top', at: 'right top' });
			}
		},
	});

	plated_live.terminal=$('#pagecake_console').terminal(plated_live.cmds,{prompt:"^> "});

	plated_live.terminal.echo("Welcome to the world of tomorrow!")
	
	plated_live.editor = ace.edit("editor");
	plated_live.editor.setTheme("ace/theme/twilight");
	plated_live.editor.session.setMode("ace/mode/javascript");

	if(plated_live.opts.noworker)
	{
		plated_live.git_setup()
	}
	else
	{
		var MagicPortal=require("magic-portal")
		var worker = new Worker("lib/plated_live_worker.js")
		plated_live.portal = new MagicPortal(worker)

		plated_live.git = await plated_live.portal.get('git')
		plated_live.pfs = await plated_live.portal.get('pfs')
	}

//	$( plated.plate("{dialogue_test}") ).dialog();

	plated_live.git_clone()

	var t2 = await plated_live.pfs.readdir("/");
	console.log( t2 )

}

plated_live.git_clone=async function(it){
	it=it || {}
	it.url=it.url || "https://github.com/xriss/"
	it.name=it.name || "plated-example"

	console.log( "fetching git" )
	await plated_live.pfs.mkdir("/"+it.name).catch(error=>{
		console.log(error); // ignore error
	});
	await plated_live.git.clone({
		dir: '/'+it.name,
		corsProxy: 'https://cors.isomorphic-git.org',
		url: it.url+it.name,
		ref: 'master',
		singleBranch: true,
		depth: 1
	})
	console.log( "fetched git" )
}

