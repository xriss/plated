
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var plated_blog={};
	
	
	plated_blog.config={};

// main settings that you can override in your blog_json config chunk
	plated_blog.config.posts_per_page=5;


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
	plated_blog.process_dirs=function(dirs){
		
		var blogs={};
		
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			
			
			if(chunks._blog_json)
			{
				blogs[dirname]=[ chunks ];
			}

			if(chunks._blog_post_json)
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
				var aj=a._blog_post_json;
				var bj=b._blog_post_json;
				
				return bj.unixtime - aj.unixtime;
			});
			
			for(var i=0;i<posts.length;i++) {
				
				var post=posts[i];

				var post_newer=posts[i-1];
				var post_older=posts[i+1];
				
				posts._blog_post_newer=post_newer && post_newer._filename+"/index.html";
				posts._blog_post_older=post_older && post_older._filename+"/index.html";
			}

// write individual blog posts and cache the merged chunks for paged output
			for(var idx=0;idx<posts.length;idx++) { post=posts[idx];
				

				var fname=post._dirname+"/index.html"
				var chunks={};
				
				plated.files.set_source(chunks,fname)
				
				chunks.body=plated.chunks.delimiter_wrap_str("_blog_post_body_one");

				plated.files.prepare_namespace(fname); // prepare merged namespace
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated.files.write( path.join(opts.output,chunks._filename) , plated.chunks.replace( plated.chunks.delimiter_wrap_str("html"),merged_chunks) );
				if(opts.dumpjson){
					plated.files.write( path.join(opts.output,chunks._filename)+".json" , JSON_stringify(merged_chunks,{space:1}) );
				}
				posts_body[idx]=merged_chunks;
				merged_chunks._body=plated.chunks.replace( plated.chunks.delimiter_wrap_str("_blog_post_body_many"),merged_chunks); // prebuild body

			}

			var pageidx=1;
			var pagename="index.html";
			var pagename_older;
			var pagename_newer;
			for( var postidx=0 ; postidx<posts.length ; postidx+=blog_json.posts_per_page )
			{
				pageidx++;
				pagename_older="page"+pageidx+".html";
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

				var fname=blog[0]._dirname+"/"+pagename
				var chunks={};
				
				plated.files.set_source(chunks,fname)

				chunks._list=list;
				chunks._blog_page_older=pagename_older;
				chunks._blog_page_newer=pagename_newer;

				chunks.body=plated.chunks.delimiter_wrap_str("_blog_page_body");

				plated.files.prepare_namespace(fname); // prepare merged namespace
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated.files.write( path.join(opts.output,chunks._filename) , plated.chunks.replace( plated.chunks.delimiter_wrap_str("html"),merged_chunks) );
				if(opts.dumpjson){
					plated.files.write( path.join(opts.output,chunks._filename)+".json" , JSON_stringify(merged_chunks,{space:1}) );
				}

				pagename_newer=pagename;
				pagename=pagename_older;
			}

// write pages of multiple blog posts
		}
		
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
	plated_blog.process_file=function(chunks){
		
// process blog_json
		var chunk=chunks._blog_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			chunk.dir            = chunk.dirname        || chunks._dirname ;
			chunk.posts_per_page = chunk.posts_per_page || plated_blog.config.posts_per_page ;
			
			chunks._blog_json=chunk;
		}
		

// process blog_post_json
		var chunk=chunks._blog_post_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse

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
			}

			chunks._blog_post_json=chunk;
		}
		
		
		return chunks;
	};


	return plated_blog;
};
