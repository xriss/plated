
var plated_live=exports;

var jsstringify=require("json-stable-stringify")

var path=require("path")

if(typeof window !== 'undefined')
{
	window.$ = window.jQuery = require("jquery");
	var split=require("jquery.splitter")
	var term=(require("jquery.terminal"))()

	var ui=require("./jquery-ui.js")

	var tree=require("jstree/dist/jstree.js")
}



var loadjs=require("loadjs");

var plated=require("plated").create({},{pfs:{}}) // create a base instance for inline chunks with no file access

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
plated_live.opts.git_url="https://github.com/xriss/plated-test"
plated_live.opts.git_user=""
plated_live.opts.git_pass=""
plated_live.opts.git_token=""
plated_live.opts.git_oauth=""
plated_live.opts.tree_mode="plated"
plated_live.opts.plated_source="plated/source"
plated_live.opts.plated_output="docs"
plated_live.opts.author_name="plated_live"
plated_live.opts.author_email="plated_live@wetgenes.com"

plated_live.opts_get=function(s)
{
	if(s=="git_repo") // special
	{
		return path.basename( plated_live.opts.git_url )
	}
	return plated_live.opts[s]
}

plated_live.opts.cd="/"+plated_live.opts_get("git_repo")

// merge opts into git call values
plated_live.gitopts=function(it)
{
	it=it || {}

	it.dir          = it.dir          || '/'+plated_live.opts_get("git_repo")
	it.corsProxy    = it.corsProxy    || 'https://cors.isomorphic-git.org'
	it.author       = it.author       || { name:plated_live.opts_get("author_name") , email:plated_live.opts_get("author_email") }
	it.username     = it.username     || plated_live.opts_get("git_user")
	it.password     = it.password     || plated_live.opts_get("git_pass")
	it.token        = it.token        || plated_live.opts_get("git_token")
	it.oauth2format = it.oauth2format || plated_live.opts_get("git_oauth")

	return it
}


plated_live.start=function(opts){
	for(var n in opts) { plated_live.opts[n]=opts[n] } // copy opts

//	loadjs([
//	],{async:false,success:function(){$(plated_live.start_loaded)}})
	
	$(plated_live.start_loaded)
}

plated_live.start_loaded=async function(){

	if(plated_live.opts_get("noworker"))
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

	var json_opts=await plated_live.pfs.readFile("/plated_live.json","utf8").catch(function(){})
	if(json_opts)
	{
//		try{
			var opts=JSON.parse(json_opts)
			for(var n in opts)
			{
				plated_live.opts[n]=opts[n] // adjust options from local data
			}
//		}catch(e){}
	}
	await plated_live.pfs.writeFile("/plated_live.json",jsstringify(plated_live.opts,{space:"\t"})).catch(function(){})
	
	// this is the plated that works in browser to build the website
	plated_live.plated=require("plated").create({
			site  :"",
			root  :"",
			source:"/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_source"),
			output:"/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_output"),
			dumpjson:true,
		},{
			pfs:plated_live.pfs,
		})


	var ace=require("brace")
	require("brace/ext/modelist")
	require("brace/theme/twilight")

	require("brace/mode/javascript")
	require("brace/mode/json")
	require("brace/mode/html")
	require("brace/mode/css")
	require("brace/mode/markdown")
	require("brace/mode/sh")
	require("brace/mode/gitignore")

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
	$("#split").height("100%").split({orientation:'vertical',limit:5,position:'20%',onDrag: resize_func });
	$("#split_left").split({orientation:'horizontal',limit:5,position:'80%',onDrag: resize_func });
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
	
	plated_live.cmds=require("./plated_live_cmds.js").create(plated_live)
	plated_live.terminal=$('#pagecake_console').terminal(plated_live.cmds,
		{
			prompt:"^> "
		}
	);

	plated_live.terminal.echo("Welcome to the world of tomorrow!")
	
	plated_live.editor=ace.edit("editor");
	plated_live.editor.setTheme("ace/theme/twilight");

	plated_live.editor.$blockScrolling = Infinity

	$("#editor").hide();

	await plated_live.git_clone()

	plated_live.jstree=$('#pagecake_tree').jstree()
	plated_live.jstree.on('changed.jstree', function (e, data) {
		if(data.selected.length>0)
		{
			var it=data.instance.get_node(data.selected[0])
			plated_live.goto_view( it.original.path )
		}
	})
	
	await plated_live.rescan_tree()
	$("#treedrop").on( "selectmenuchange", function( event, ui ) { plated_live.rescan_tree() } );

	plated_live.viewing_filepath=""
	$("body").keydown(plated_live.keydown)
	$(plated_live.editor.textInput.getElement()).keydown(plated_live.keydown)
 
 
	window.setInterval(plated_live.cron,1000) // start cron tasks
}

plated_live.keydown=function(e)
{
//	console.log(e.which)
	if(e.which==115) // F4
	{
		plated_live.swap_view()
		return false;
	}
}


plated_live.goto_view=async function(fn)
{
	if(!fn) { return }
	console.log("switch to "+fn)

	var source="/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_source")+"/"
	var output="/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_output")+"/"

	$("#view_iframe").remove() // kill iframe

	if( fn.startsWith(output) )
	{
		var stat = await plated_live.pfs.stat(fn).catch(e=>{})
		if(stat && stat.type=="file")
		{
			$("#editor").hide();
			$("#split_right").append('<iframe id="view_iframe" style="background:#fff"></iframe>');
			await plated_live.plated.build() // force updates 
			
			var filepath=fn
			var filedata=await plated_live.pfs.readFile(filepath,"utf8")
			var win = document.getElementById('view_iframe').contentWindow
			var doc = win.document
			doc.open()
			if(filepath.endsWith(".html"))
			{
				doc.write(filedata)
			}
			else
			{
				doc.write("<pre>")
				doc.write(filedata)
				doc.write("</pre>")
			}
			doc.close()
			plated_live.viewing_filepath=filepath
			$(win).keydown(plated_live.keydown)

		}
	}
	else
	{
		$("#editor").show()
		plated_live.show_session({path:fn})
	}

}

plated_live.swap_view=async function()
{
	var source="/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_source")+"/"
	var output="/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_output")+"/"

	if( plated_live.viewing_filepath.startsWith(source) )
	{
//		console.log("source : "+plated_live.viewing_filepath)

		var fn=plated_live.viewing_filepath.substring(source.length)
		var fo=output+plated_live.plated.files.filename_to_output(fn)

		var stat = await plated_live.pfs.stat(fo).catch(f=>{})
		if(stat && stat.type=="file")
		{
			return plated_live.goto_view(fo)
		}
	}
	else
	if( plated_live.viewing_filepath.startsWith(output) )
	{
//		console.log("output : "+plated_live.viewing_filepath)

		var fn=plated_live.viewing_filepath.substring(output.length)

		var fo=source+fn
		var stat = await plated_live.pfs.stat(fo).catch(f=>{})
		if(stat && stat.type=="file")
		{
			return plated_live.goto_view(fo) // try same filename in source path
		}

		var aa=fn.split(".")
		
		var i=aa.length
		if(i>1)
		{
			aa[i]=aa[i-1]
			aa[i-1]="^"
		}
		
		fn=aa.join(".")
		fo=source+fn
		stat = await plated_live.pfs.stat(fo).catch(f=>{})
		if(stat && stat.type=="file")
		{
			return plated_live.goto_view(fo) // filename with .^. 
		}

	}
}

plated_live.cron=async function()
{
	if(plated_live.cron.lock) { return; } // there can be only one
	plated_live.cron.lock=true
	
	for(var path in plated_live.sessions)
	{
		var session=plated_live.sessions[path]
		var undo=session.getUndoManager()
		if( !undo.isClean() )
		{
			await plated_live.pfs.writeFile(path,session.getValue(),"utf8") // auto save
			console.log("Saved "+path)
			undo.markClean()
		}
		
	}

	plated_live.cron.lock=false
}

plated_live.sessions={}
plated_live.show_session=async function(it){
	if(it.path)
	{
		var stat = await plated_live.pfs.stat(it.path).catch(e=>{})
		if(stat && stat.type=="file")
		{
//console.log("Loading "+it.path)
			if(!plated_live.sessions[it.path]) // create new session
			{
				var filedata=await plated_live.pfs.readFile(it.path,"utf8")
				var mode = ace.acequire("ace/ext/modelist").getModeForPath(it.path).mode
				plated_live.sessions[it.path]=ace.createEditSession( filedata , mode )
				plated_live.sessions[it.path].setUseWrapMode(true);
			}
			plated_live.editor.setSession( plated_live.sessions[it.path] )
			plated_live.viewing_filepath=it.path
		}
	}
}


plated_live.git_clone=async function(){

	await plated_live.pfs.mkdir("/"+plated_live.opts_get("git_repo")).catch(error=>{ console.log(error) })
	await plated_live.git.clone({
		dir: '/'+plated_live.opts_get("git_repo"),
		corsProxy: 'https://cors.isomorphic-git.org',
		url: plated_live.opts_get("git_url"),
		ref: 'master',
		singleBranch: true,
		depth: 1
	}).catch(error=>{ console.log(error) })
}

plated_live.rescan_tree=async function()
{
	var ov = $( "#treedrop" ).prop("selectedIndex")
	
	if(ov==1) // full files system
	{
		var d1= await plated_live.get_dir_tree("")
		
		plated_live.jstree.jstree(true).settings.core.data = d1
	}
	else
	{
		var d1= await plated_live.get_dir_tree("/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_source"))
		var d2= await plated_live.get_dir_tree("/"+plated_live.opts_get("git_repo")+"/"+plated_live.opts_get("plated_output"),{mode:"view"})
		
		plated_live.jstree.jstree(true).settings.core.data = [
			{ text:"/plated_live.json" , path:"/plated_live.json" },
			{ text:"Edit*", children:d1 , state:{opened:true}} ,
			{ text:"View*", children:d2 }
		]
	}
	plated_live.jstree.jstree(true).refresh();
}


plated_live.get_dir_tree=async function(dir,base)
{
	dir=dir||""
	base=base||{}
	var dat=[]
	var walk = async function(dir,dat)
	{
		var list = await plated_live.pfs.readdir(dir||"/").catch(e=>{})
		var addfile=async function(file){
			var path=dir+"/"+file
//			console.log(path)
			var stat = await plated_live.pfs.stat(path).catch(e=>{})
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
		for(idx in list||{}){ var file=list[idx]
			await addfile(file)
		}
	}
	await walk(dir,dat)

//console.log("dat")
//	console.log(dat)
	return dat
}


