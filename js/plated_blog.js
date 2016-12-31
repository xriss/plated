
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

// the following chunk names can be altered, if they conflict with chunk names already used (opts)

// special chunk names for blog
	plated_blog.config.blog_json = opts.blog_json || "blog_json"; // json settings for the blog
	plated_blog.config.blog_body = opts.blog_body || "blog_body"; // this is used to display a list of multiple blog posts, find them in {_list}

// these control the generation of each single blog post
	plated_blog.config.blog_post_json = opts.blog_post_json || "blog_post_json"; // json details for a single blog post
	plated_blog.config.blog_post_body = opts.blog_post_body || "blog_post_body"; // the content of a single blog post ( probably markdown )
	
// these are used to render slightly different views of blog_post_body, for use in a single page or in a list
	plated_blog.config.blog_post_body_one  = opts.blog_post_body_one  || "blog_post_body_one";  // wrap a single post for use in its own page
	plated_blog.config.blog_post_body_many = opts.blog_post_body_many || "blog_post_body_many"; // wrap a single post for use in a list IE the main blog page.



// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_blog.process_dirs=function(dirs){
		
		var blogs={};
		
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			
			
			if(chunks[plated_blog.config.blog_json])
			{
				blogs[dirname]=[ chunks ];
			}

			if(chunks[plated_blog.config.blog_post_json])
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
		
//ls(blogs);
		
		for(var blogname in blogs) { var blog=blogs[blogname];

			var blog_json=blog[0][plated_blog.config.blog_json];
			
			var posts=[];
			var posts_body=[];
			
			for(var idx=0;idx<blog.length;idx++)
			{
				if(blog[idx][plated_blog.config.blog_post_json]) // got a blogpost
				{
					posts.push(blog[idx]);
				}
			}
	
// sort new to old...	
//			posts.sort(function(a,b){
//			});
			

// write individual blog posts			
			for(var idx=0;idx<posts.length;idx++) { post=posts[idx];
				
				var blog_post_json=post[plated_blog.config.blog_post_json];

				var fname=post._source+"/index.html"
				var chunks={};
				
				chunks._source=fname;
				chunks._output=plated.files.filename_to_output(fname);
				
				chunks.body="{"+plated_blog.config.blog_post_body_one+"}";

				plated.files.prepare_namespace(fname); // prepare merged namespace
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated.files.write( path.join(opts.output,chunks._output) , plated.chunks.replace("{html}",merged_chunks) );
				if(opts.dumpjson){
					plated.files.write( path.join(opts.output,chunks._output)+".json" , JSON_stringify(merged_chunks,{space:1}) );
				}
				posts_body[idx]=plated.chunks.replace("{"+plated_blog.config.blog_post_body_many+"}",merged_chunks);

			}

			var pageidx=1;
			var pagename="index.html";
			for( var postidx=0 ; postidx<posts.length ; postidx+=blog_json.posts_per_page )
			{
				var list=[];
				
				for(var i=postidx ; i<postidx+blog_json.posts_per_page ; i++ )
				{
					if(posts_body[i])
					{
						list.push(posts_body[i]);
					}
				}

				var fname=blog[0]._source+"/"+pagename
				var chunks={};
				
				chunks._source=fname;
				chunks._output=plated.files.filename_to_output(fname);
				chunks._list=list;

				chunks.body="{"+plated_blog.config.blog_body+"}";

				plated.files.prepare_namespace(fname); // prepare merged namespace
				var merged_chunks=plated.chunks.merge_namespace(chunks);

				plated.files.write( path.join(opts.output,chunks._output) , plated.chunks.replace("{html}",merged_chunks) );
				if(opts.dumpjson){
					plated.files.write( path.join(opts.output,chunks._output)+".json" , JSON_stringify(merged_chunks,{space:1}) );
				}

				pageidx++;
				pagename="page"+pageidx+".html";
			}

// write pages of multiple blog posts
		}
		
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
	plated_blog.process_file=function(chunks){
		
// process blog_json
		var chunk=chunks[plated_blog.config.blog_json];
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			chunk.dir            = chunk.dir            || chunks._source ;
			chunk.posts_per_page = chunk.posts_per_page || plated_blog.config.posts_per_page ;
			
			chunks[plated_blog.config.blog_json]=chunk;
		}
		

// process blog_post_json
		var chunk=chunks[plated_blog.config.blog_post_json];
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse

			if(!chunk.unixtime)
			{
				var s=chunk.datetime || chunks._source;
				
				if(typeof(s)=="string") // convert from string to array
				{
					var a=s.split(/[^0-9]+/); 
//console.log(a);
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
//console.log(dd);
					chunk.datetime=dd;
				}

				chunk.unixtime=Date.UTC(dd[0],dd[1]-1,dd[2],dd[3],dd[4],dd[5])/1000;
			}

			chunks[plated_blog.config.blog_post_json]=chunk;
		}
		
		
		return chunks;
	};


	return plated_blog;
};
