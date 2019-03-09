
var plated_live=exports;

if(typeof window !== 'undefined')
{
	window.$ = window.jQuery = require("jquery");
	var split=require("jquery.splitter")
	var term=(require("jquery.terminal"))()

	var ui=require("./jquery-ui.js")

	var tree=require("jstree/dist/jstree.js")
}



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
plated_live.opts.git_url="https://github.com/xriss/"
plated_live.opts.git_repo="plated-example"
plated_live.opts.git_user=""
plated_live.opts.git_pass=""
plated_live.opts.git_token=""
plated_live.opts.tree_mode="plated"
plated_live.opts.plated_source="plated/source"
plated_live.opts.plated_output="docs"

plated_live.opts.cd="/"+plated_live.opts.git_repo


plated_live.start=function(opts){
	for(var n in opts) { plated_live.opts[n]=opts[n] } // copy opts

//	loadjs([
//	],{async:false,success:function(){$(plated_live.start_loaded)}})
	
	$(plated_live.start_loaded)
}

plated_live.cmds={}
plated_live.cmds.add=function(a,b){ this.echo(a + b); }

require("./plated_live_cmds.js").inject(plated_live) // add console commands

plated_live.start_loaded=async function(){

	var ace=require("brace")
	require("brace/ext/modelist")
	require("brace/theme/twilight")

	require("brace/mode/javascript")
	require("brace/mode/json")
	require("brace/mode/html")
	require("brace/mode/css")
	require("brace/mode/markdown")

	$("html").prepend(plated.plate('<style>{css}</style>')) // load our styles

	$("html").prepend("<style>"+require("jquery.splitter/css/jquery.splitter.css")+"</style>")
	$("html").prepend("<style>"+require("jquery.terminal/css/jquery.terminal.css")+"</style>")
	$("html").prepend("<style>"+require('fs').readFileSync(__dirname + '/jquery-ui.css', 'utf8')+"</style>")
	$("html").prepend("<style>"+require("jstree/dist/themes/default/style.css")+"</style>")

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

	$("#treedrop").selectmenu();

	$("#menubar").menu({
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

	plated_live.editor.$blockScrolling = Infinity

	if(plated_live.opts.noworker)
	{
		plated_live.git_setup()
	}
	else
	{
		var MagicPortal=require("magic-portal")
		var worker = require('webworkify')(require("./plated_live_worker.js"))
		plated_live.portal = new MagicPortal(worker)

		plated_live.git = await plated_live.portal.get('git')
		plated_live.pfs = await plated_live.portal.get('pfs')
	}

	await plated_live.git_clone()

	plated_live.jstree=$('#pagecake_tree').jstree()
	plated_live.jstree.on('changed.jstree', function (e, data) {
		if(data.selected.length>0)
		{
			var n=data.instance.get_node(data.selected[0])
//			console.log(n.original.path)
			plated_live.show_session({path:n.original.path})
		}
	})
	
	await plated_live.rescan_tree()
	
}

plated_live.sessions={}
plated_live.show_session=async function(it){
	if(it.path)
	{
		var stat = await plated_live.pfs.stat(it.path)
		if(stat && stat.type=="file")
		{
//console.log("Loading "+it.path)
			if(!plated_live.sessions[it.path]) // create new session
			{
				var filedata=await plated_live.pfs.readFile(it.path,"utf8")
				var mode = ace.acequire("ace/ext/modelist").getModeForPath(it.path).mode
				plated_live.sessions[it.path]=ace.createEditSession( filedata , mode )
			}
			plated_live.editor.setSession( plated_live.sessions[it.path] )
		}
	}
}


plated_live.git_clone=async function(){

	await plated_live.pfs.mkdir("/"+plated_live.opts.git_repo).catch(error=>{ console.log(error) })
	await plated_live.git.clone({
		dir: '/'+plated_live.opts.git_repo,
		corsProxy: 'https://cors.isomorphic-git.org',
		url: plated_live.opts.git_url+plated_live.opts.git_repo,
		ref: 'master',
		singleBranch: true,
		depth: 1
	}).catch(error=>{ console.log(error) })
}

plated_live.rescan_tree=async function()
{
	var d1= await plated_live.get_dir_tree("/"+plated_live.opts.git_repo+"/"+plated_live.opts.plated_source)
	var d2= await plated_live.get_dir_tree("/"+plated_live.opts.git_repo+"/"+plated_live.opts.plated_output)
	
	plated_live.jstree.jstree(true).settings.core.data = [ { text:"Edit/", children:d1 , state:{opened:true}} , { text:"View/", children:d2 } ]
	plated_live.jstree.jstree(true).refresh();
}


plated_live.get_dir_tree=async function(dir,base)
{
	dir=dir||""
	base=base||{}
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
				for(var n in base) { it[n]=base[n] } // dupe base
				it.text=file+"/"
				it.path=path
				await walk(path,it.children)
				dat.push(it)
			}
			else
			{
				var it={}
				for(var n in base) { it[n]=base[n] } // dupe base
				it.text=file
				it.path=path
				dat.push(it)
			}
		}
		for(idx in list){ var file=list[idx]
			await addfile(file)
		}
	}
	await walk(dir,dat)

//console.log("dat")
//	console.log(dat)
	return dat
}


