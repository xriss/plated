
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_plugin_blog={};
	
	
	plated_plugin_blog.config={};

// main settings that you can override in your blog_json config chunk
	plated_plugin_blog.config.posts_per_page=5;


// special chunk names that trigger blog processing

// json settings for the blog
//		_blog_json

// json details for a single blog post
//		_blog_post_json

// the content of a single blog post ( probably markdown )
//		_blog_post_body

// this is used to display a list of multiple blog posts, find them in {_list}
//		_blog_page_body

// wrap a single post for use in its own page
//		_blog_post_body_one

// wrap a single post for use in a list IE the main blog page {_blog_page_body}.
//		_blog_post_body_many



// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_plugin_blog.process_dirs=function(dirs){
		
		var blogs={};
		var drafts=[];
		
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			
			if(chunks._blog_json)
			{
				blogs[dirname]=[ chunks ];
			}

			if(chunks._blog_post_json)
			{
				if(chunks._blog_post_json.draft) //ignore draft posts from lists
				{
					drafts.push( chunks ); // but we still publish the page for testing
				}
				else
				{
					for( var blogname in blogs ) // find blog we belong to
					{
						if( dirname.substr(0, blogname.length) == blogname ) // found
						{
							blogs[blogname].push( chunks ); // and add to array
							break;
						}
					}
				}

			}
		}
		
// write drafts
		for(var idx=0;idx<drafts.length;idx++) { var post=drafts[idx];

			var fname=plated.files.filename_to_dirname(post._sourcename)+"/index.html"
			var output_filename = path.join( opts.output , plated.files.filename_to_output(fname) );
			var chunks={};
			
			plated.files.set_source(chunks,fname)
			
			chunks.body=plated.chunks.delimiter_wrap_str("_blog_post_body_one");

			plated.files.prepare_namespace(fname); // prepare merged namespace
			var merged_chunks=plated.chunks.merge_namespace(chunks);

			plated.files.write( output_filename , plated.chunks.replace( plated.chunks.delimiter_wrap_str("html"),merged_chunks) );
			if(opts.dumpjson){
				plated.files.write( output_filename+".json" , JSON_stringify(merged_chunks,{space:1}) );
			}

			console.log(timestr()+" BLOGDRAFT "+fname)
		}

		for(var blogname in blogs) { var blog=blogs[blogname];

			var blog_json=blog[0]._blog_json;
			
			var posts=[];
			var posts_body=[];
			
			for(var idx=0;idx<blog.length;idx++)
			{
				if(blog[idx]._blog_post_json) // got a blogpost
				{
					posts.push(blog[idx]);
				}
			}
	
// sort new to old...	
			posts.sort(function(a,b){
				return b._blog_post_json.unixtime - a._blog_post_json.unixtime;
			});
			
			for(var i=0;i<posts.length;i++) {
				
				var post=posts[i];

				var post_newer=posts[i-1];
				var post_older=posts[i+1];
				
				post._blog_post_newer=post_newer && post_newer._filename+"/";
				post._blog_post_older=post_older && post_older._filename+"/";
			}
// write individual blog posts and cache the merged chunks for paged output
			for(var idx=0;idx<posts.length;idx++) { var post=posts[idx];
				

				var fname=plated.files.filename_to_dirname(post._sourcename)+"/index.html"
				var output_filename = path.join( opts.output , plated.files.filename_to_output(fname) );
				var chunks={};
				
				plated.files.set_source(chunks,fname)
				
				chunks.body=plated.chunks.delimiter_wrap_str("_blog_post_body_one");

				plated.files.prepare_namespace(fname); // prepare merged namespace
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated.files.write( output_filename , plated.chunks.replace( plated.chunks.delimiter_wrap_str("html"),merged_chunks) );
				if(opts.dumpjson){
					plated.files.write( output_filename+".json" , JSON_stringify(merged_chunks,{space:1}) );
				}
				posts_body[idx]=merged_chunks;
				merged_chunks._body=plated.chunks.replace( plated.chunks.delimiter_wrap_str("_blog_post_body_many"),merged_chunks); // prebuild body

				console.log(timestr()+" BLOGPOST "+fname)
			}

			var pageidx=1;
			var pagename=plated.files.filename_to_dirname(blog[0]._sourcename)+"/index.html";
			var pagename_older;
			var pagename_newer;
			for( var postidx=0 ; postidx<posts.length ; postidx+=blog_json.posts_per_page )
			{
				pageidx++;
				pagename_older=plated.files.filename_to_dirname(blog[0]._sourcename)+"/page"+pageidx+".html";

				if( postidx+blog_json.posts_per_page >= posts.length) // no more pages
				{
					pagename_older=undefined;
				}
				var list=[];
				
				for(var i=postidx ; i<postidx+blog_json.posts_per_page ; i++ )
				{
					if(posts_body[i])
					{
						list.push(posts_body[i]);
					}
				}

				var fname=pagename
				var output_filename = path.join( opts.output , plated.files.filename_to_output(fname) );
				var chunks={};
				
				plated.files.set_source(chunks,fname)

				chunks._list=list;
				chunks._blog_page_older=pagename_older && (opts.root+pagename_older);
				chunks._blog_page_newer=pagename_newer && (opts.root+pagename_newer);

				chunks.body=plated.chunks.delimiter_wrap_str("_blog_page_body");

				plated.files.prepare_namespace(fname); // prepare merged namespace
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated.files.write( output_filename , plated.chunks.replace( plated.chunks.delimiter_wrap_str("html"),merged_chunks) );
				if(opts.dumpjson){
					plated.files.write( output_filename+".json" , JSON_stringify(merged_chunks,{space:1}) );
				}

				console.log(timestr()+" BLOG "+fname)

				pagename_newer=pagename;
				pagename=pagename_older;
			}

// write pages of multiple blog posts
		}
		
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
	plated_plugin_blog.process_file=function(chunks){
		
// process blog_json
		var chunk=chunks._blog_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			chunk.dir            = chunk.dirname        || chunks._sourcename ;
			chunk.posts_per_page = chunk.posts_per_page || plated_plugin_blog.config.posts_per_page ;
			
			chunks._blog_json=chunk;
		}
		

// process blog_post_json
		var chunk=chunks._blog_post_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse

			if(chunk.draft===undefined)
			{
				var s=chunks._filename.split("/"); s=s[s.length-1];
				if( s.substr(0,6) == "draft-" )
				{
					chunk.draft=true;
				}
			}
			
			if(!chunk.unixtime)
			{
				var s=chunk.datetime || chunks._filename;
				
				if(typeof(s)=="string") // convert from string to array
				{
					var a=s.split(/[^0-9]+/); 
					var idx=0;
					var dd=[1970,1,0,0,0,0]; // the beginning of time
					for(var i=0;i<a.length;i++)
					{
						var v=a[i];
						if(idx==0) // year
						{
							if(v.length==4)
							{
								dd[idx++]=parseInt(v);
							}
						}
						else
						if(idx>0) // month/day/hour/minute/second
						{
							if(v.length==2)
							{
								dd[idx++]=parseInt(v);
							}
							else
							{
								idx=0; // reset
							}
						}
						else
						{
							idx=0; // reset
						}
					}
					chunk.datetime=dd;
				}

				chunk.unixtime=Date.UTC(dd[0],dd[1]-1,dd[2],dd[3],dd[4],dd[5])/1000;
				chunk.datedash=("0000" + dd[0]).substr(-4,4)+"-"+("00" + dd[1]).substr(-2,2)+"-"+("00" + dd[2]).substr(-2,2);
//				chunk.timecolon=("00" + dd[3]).substr(-2,2)+":"+("00" + dd[4]).substr(-2,2)+":"+("00" + dd[5]).substr(-2,2);
			}

			chunks._blog_post_json=chunk;
		}
		
		
		return chunks;
	};


	return plated_plugin_blog;
};
