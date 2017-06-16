
var fs = require('fs');
var util=require('util');
var path=require('path');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_redirect={};
	
	
	plated_redirect.config={};

// if this flag is set then we will create html files to perform browser side redirection
	plated_redirect.config.browser=true;

// the html template that will be used for browser side redirections
	plated_redirect.config.html=""+
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
//	plated_redirect.config.server=true;

// not currently implemented, depends a lot on the server and if we publish to github
// then we have no choice but to use html only redirects so currently safest to make that
// work as well as possible.




// special chunk names that trigger redirect processing

// json settings for the redirect
//		_redirect_json



// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_redirect.process_dirs=function(dirs){
				
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			if(chunks._redirect_json)
			{
				for( n in ( chunks._redirect_json.files || {} ) )
				{
					var v=chunks._redirect_json.files[n]
					
					plated.files.prepare_namespace(dirname); // prepare merged namespace
					var merged_chunks=plated.chunks.merge_namespace(chunks);

					merged_chunks.html=plated_redirect.config.html
					merged_chunks._redirect_from=plated.chunks.replace( n , merged_chunks )
					merged_chunks._redirect_to=plated.chunks.replace( v , merged_chunks )

					var output_filename = path.join( opts.output , merged_chunks._redirect_from );

					plated.files.write( output_filename , plated.chunks.replace( merged_chunks.html , merged_chunks ) );
					if(opts.dumpjson){
						plated.files.write( output_filename+".json" , JSON_stringify(merged_chunks,{space:1}) );
					}

					console.log(timestr()+" REDIRECT "+merged_chunks._redirect_from+" -> "+merged_chunks._redirect_to)

				}
			}

		}
		
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
	plated_redirect.process_file=function(chunks){
		
// process redirect_json
		var chunk=chunks._redirect_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			
			chunks._redirect_json=chunk;
		}
		
		return chunks;
	};


	return plated_redirect;
};
