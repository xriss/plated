

/***************************************************************************
--[[#js.plated_plugin.redirect

A blog plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_redirect = require("./plated_plugin_redirect.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

]]*/

/***************************************************************************
--[[#html.plated_plugin.redirect

	#^_redirect_json
	{
		files:{
			"from/index.html":"to/",
			"other/index.html":"to/",
		},
	}
	
A chunk of this name must be created in a directory scope file for this 
plugin to parse it. files is a map of redirections we require.

Perform a redirect of files, using simple html javascript redirection, 
to another url. We mostly make use of the automatic use of an 
index.html inside a given directory so in the case above ./from will 
get redirected to ./to note that these can contain one level of macro 
expansion so {_root}dir is a reasonable redirection.

Multiple redirections can be performed in a single json configuration 
but be aware that we end up actually creating files to perform these 
redirections so be careful not to clash with other files.

An example can be found in test-source/005-redirect

]]*/

//var fs = require('fs');
var util=require('util');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_plugin_redirect={};
	
	
	plated_plugin_redirect.config={};

// if this flag is set then we will create html files to perform browser side redirection
	plated_plugin_redirect.config.browser=true;

// the html template that will be used for browser side redirections
	plated_plugin_redirect.config.html=""+
"<html>\n"+
"	<head>\n"+
"		<link rel=\"canonical\" href=\"{_redirect_to}\">\n"+
"		<meta http-equiv=\"refresh\" content=\"0; url={_redirect_to}\">\n"+
"	</head>\n"+
"	<body>\n"+
"		<div class=\"redirect\">\n"+
"			<h1>Redirecting…</h1>\n"+
"			<a href=\"{_redirect_to}\">Click here if you are not redirected.</a>\n"+
"			<script>location=\"{_redirect_to}\"</script>\n"+
"		</div>\n"+
"	</body>\n"+
"</html>\n"+
"";


// if this flag is set then we will create config files to perform server side redirection
//	plated_plugin_redirect.config.server=true;

// not currently implemented, depends a lot on the server and if we publish to github
// then we have no choice but to use html only redirects so currently safest to make that
// work as well as possible.




// special chunk names that trigger redirect processing

// json settings for the redirect
//		_redirect_json



/***************************************************************************
--[[#js.plated_plugin.redirect.process_dirs

	dirs = plated_plugin_redirect.process_dirs(dirs)

Tweak all the base chunks grouped by dir name and pre cascaded/merged

]]*/
	plated_plugin_redirect.process_dirs=async function(dirs){
				
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			if(chunks._redirect_json)
			{
				for( n in ( chunks._redirect_json.files || {} ) )
				{
					var v=chunks._redirect_json.files[n]
					
					plated.files.prepare_namespace(dirname); // prepare merged namespace
					var merged_chunks=plated.chunks.merge_namespace(chunks);

					merged_chunks.html=plated_plugin_redirect.config.html
					merged_chunks._redirect_from=plated.files.joinpath( dirname , n )
					merged_chunks._redirect_to=plated.chunks.replace( v , merged_chunks )

//					var output_filename = plated.files.joinpath( opts.output , merged_chunks._redirect_from );
					
					merged_chunks._output_filename=merged_chunks._redirect_from
					merged_chunks._output_chunkname="html"
					await plated.output.remember_and_write( merged_chunks )

//					plated.files.write( output_filename , plated.chunks.replace( merged_chunks.html , merged_chunks ) );
//					if(opts.dumpjson){
//						plated.files.write( output_filename+".json" , JSON_stringify(merged_chunks,{space:1}) );
//					}

					console.log(timestr()+" REDIRECT "+merged_chunks._redirect_from+" -> "+merged_chunks._redirect_to)

				}
			}

		}
		
		return dirs;
	};


/***************************************************************************
--[[#js.plated_plugin.redirect.process_file

	chunks = plated_plugin_redirect.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be 
available.

	#^_redirect_json

Is a special chunk name that we will parse as json and contain 
configuration data to setup redirects.

]]*/
	plated_plugin_redirect.process_file=function(chunks){
		
// process redirect_json
		var chunk=chunks._redirect_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			
			chunks._redirect_json=chunk;
		}
		
		return chunks;
	};


	return plated_plugin_redirect;
};
