
var plated_live=exports;

var loadjs=require("loadjs");

var plated=require("plated").create({"hashchunk":"#^",delimiter:"{}"}) // create a base instance

plated_live.chunks={}
plated.chunks.fill_chunks( require('fs').readFileSync(__dirname + '/chunks.html', 'utf8'), plated_live.chunks )
plated.chunks.fill_chunks( require('fs').readFileSync(__dirname + '/chunks.css', 'utf8'), plated_live.chunks )

plated.plate=function(str){ return plated.chunks.replace(str,plated_live.chunks) }

plated_live.git_setup=async function(){
	var fs=new (require("@isomorphic-git/lightning-fs"))('plated_live',{wipe:false})
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
		"lib/ace/ext-modelist.js",
		"lib/jquery-ui-themes/themes/ui-darkness/jquery-ui.min.css",
		"lib/jquery.splitter.js",
		"lib/jquery.splitter.css",
		"lib/jquery.terminal.min.js",
		"lib/jquery.terminal.min.css",
		"lib/jstree/jstree.min.js",
		"lib/jstree/themes/default/style.min.css",
	],{async:false,success:function(){$(plated_live.start_loaded)}})
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
	
	plated_live.editor=ace.edit("editor");
	plated_live.editor.setTheme("ace/theme/twilight");
//	plated_live.editor.session.setMode("ace/mode/javascript");

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

	await plated_live.git_clone({name:"plated-example"})

	plated_live.jstree=$('#pagecake_tree').jstree({
		'core' : {
			'data' : await plated_live.get_dir_tree()
		}
	})

	plated_live.jstree.on('changed.jstree', function (e, data) {
		if(data.selected.length>0)
		{
			var n=data.instance.get_node(data.selected[0])
//			console.log(n.original.path)
			plated_live.load_file({path:n.original.path})
		}
	})
}

plated_live.load_file=async function(it){
	if(it.path)
	{
		var stat = await plated_live.pfs.stat(it.path)
		if(stat && stat.type=="file")
		{
//console.log("Loading "+it.path)
			var d=await plated_live.pfs.readFile(it.path,"utf8")
			plated_live.editor.setValue(d,-1);
			
			var modelist = ace.require("ace/ext/modelist")
			var mode = modelist.getModeForPath(it.path).mode
			plated_live.editor.session.setMode(mode)
		}
	}
}


plated_live.git_clone=async function(it){
	it=it || {}
	it.url=it.url || "https://github.com/xriss/"
	it.name=it.name || "plated-example"

	console.log( "fetching git" )

	await plated_live.pfs.mkdir("/"+it.name).catch(error=>{ console.log(error) })
	await plated_live.git.clone({
		dir: '/'+it.name,
		corsProxy: 'https://cors.isomorphic-git.org',
		url: it.url+it.name,
		ref: 'master',
		singleBranch: true,
		depth: 1
	}).catch(error=>{ console.log(error) })

	console.log( "fetched git" )
}


plated_live.get_dir_tree=async function()
{
	
console.log("walking")
	var dat=[]
	var walk = async function(dir,dat)
	{
//console.log(dir||"/")
		var list = await plated_live.pfs.readdir(dir||"/")
//console.log("list")
//console.log(list)
			var addfile=async function(file){
			var path=dir+"/"+file
//			console.log(path)
			var stat = await plated_live.pfs.stat(path)
			if (stat && stat.type=="dir")
			{
				var it={children:[]}
				it.text=file+"/"
				it.path=path
				await walk(path,it.children)
				dat.push(it)
			}
			else
			{
				var it={}
				it.text=file
				it.path=path
				dat.push(it)
			}
		}
		for(idx in list){ var file=list[idx]
			await addfile(file)
		}
	}
	await walk("",dat)

//console.log("dat")
//	console.log(dat)
	return dat
}


