
/***************************************************************************
--[[#js.plated_plugin.blog

A blog plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_blog = require("./plated_plugin_blog.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

]]*/

/***************************************************************************
--[[#html.plated_plugin.blog

	#^_blog_json
	{
		posts_per_page:5,
		posts_per_feed:20,
		url="http://base.site/url/",
		feed={
			title="Feed Title",
		}
	}

A chunk of this name must be created in a directory scope file for this 
plugin to parse it. posts_per_page is the number of posts per page, we 
will create as many pages as we need.

posts_per_feed specifys the number of posts to publish in the feed.json 
file. Which will be published using any data suplied in feed which can 
contain any valid jsonfeed values. The base url must also be suplied 
since feeds are expected to be copied to other domains. This url is 
intentionally seperate from _root as it must be explictly set and we 
can not get away with relative paths here.

Every directory within this blog directory will now be treated as a blogpost.

See source/blog for an example of this all fits together. Inside each 
of these directories we look for.

	#^_blog_post_json
	{
		"title":"my title",
		"author":"my name",
		tags=["tag1","tag2"],
		feed={
			atatchments=[{url="http://domain.full/thing.mp3",mimie_type="mime/type"}],
		}
	}
	
Which contains metadata about the blog post, the feed object can 
contain any valid jsonfeed settings, by we try and set useful defaults 
from the rest of the metadata. All of these values can also be used in 
your templates to render the blog posts.

	#^_blog_post_body form=markdown
	This is my blog post body.

Our blog body is to be found in this chunk name, probably best to use 
markdown as it makes writing blog posts easier.

When it comes to generating the pages then the following chunks should 
be setup in base directory.

	#^_blog_page_body
	This is a page of blog posts, eg the front page.
	
Within this chunk we provide _blog_page_older as the url of an older 
page and _blog_page_newer as the url of a newer page. If there is no 
newer or older page then this will be empty. _list will contain an 
array of blog posts that we intend to display in this page. It will be 
at least one post and no more than the posts_per_page setting.

	#^_blog_post_body
	This is a single blog post, when viewed on its own page.

Within this chunk we provide _blog_post_older as the url of an older 
page and _blog_post_newer as the url of a newer page. If there is no 
newer or older page then this will be empty. _blog_post_body will 
contain the _blog_post_body as defined in the blog post directory.


]]*/

//var fs = require('fs');
var util=require('util');
var watch=require('watch');
var JSON5=require('json5');
var JSON_stringify = require('json-stable-stringify');
var jsonfeedToAtom = require('jsonfeed-to-atom')


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var timestr=function(){ return new Date().toISOString().replace(/^.+T/, "").replace(/\..+/, ""); }

	var plated_plugin_blog={};
	
	
	plated_plugin_blog.config={};

// main settings that you can override in your blog_json config chunk
	plated_plugin_blog.config.posts_per_page=5;

	plated_plugin_blog.config.posts_per_feed=20;

	plated_plugin_blog.config.url="/"

	plated_plugin_blog.config.feed={
		title:"Title",
	}


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



/***************************************************************************
--[[#js.plated_plugin.blog.process_dirs

	dirs = plated_plugin_blog.process_dirs(dirs)

Tweak all the base chunks grouped by dir name and pre cascaded/merged

]]*/
	plated_plugin_blog.process_dirs=async function(dirs){
		
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
			var chunks={};
			
			plated.files.set_source(chunks,fname)

			chunks.body=plated.chunks.delimiter_wrap_str("_blog_post_body_one");

			plated.files.prepare_namespace(fname); // prepare merged namespace
			var merged_chunks=plated.chunks.merge_namespace(chunks);

			merged_chunks._output_filename=plated.files.filename_to_output(fname)
			merged_chunks._output_chunkname="html"
			await plated.output.remember_and_write( merged_chunks )

			console.log(timestr()+" BLOGDRAFT "+fname)
		}

		for(var blogname in blogs)
		{
			var blog=blogs[blogname];

			var blog_json=blog[0]._blog_json;
			
			// assign to tags arrays and all
			var tags={"":[]}
			for(var idx=0;idx<blog.length;idx++)
			{
				if(blog[idx]._blog_post_json) // got a blogpost
				{
					tags[""].push(blog[idx])
					if( blog[idx]._blog_post_json.tags )
					{
						for(var tidx=0;tidx<blog[idx]._blog_post_json.tags.length;tidx++)
						{
							var tag=blog[idx]._blog_post_json.tags[tidx]
							if(tag)
							{
								tags[tag]=tags[tag] || []
								tags[tag].push(blog[idx])
							}
						}
					}
				}
			}
			
			var tagnames=Object.keys(tags) //array of tag names
			
			for( var tidx=0 ; tidx<=tagnames.length ; tidx++ )
			{
				var posts;
				var posts_body=[];
				var tagdir=""
				var tag=tagnames[tidx]
				if(tag)
				{
					posts=tags[tag]
					tagdir="/"+tag
				}
				else
				if( tidx==tagnames.length )
				{
					posts=tags[""]
				}
			
// sort new to old...
				if(posts)
				{
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
	//					var output_filename = plated.files.joinpath( opts.output , plated.files.filename_to_output(fname) );
						var chunks={};
						
						plated.files.set_source(chunks,fname)

						chunks.body=plated.chunks.delimiter_wrap_str("_blog_post_body_one");

						plated.files.prepare_namespace(fname); // prepare merged namespace
						var merged_chunks=plated.chunks.merge_namespace(chunks);

						merged_chunks._output_filename=plated.files.filename_to_output(fname)
						merged_chunks._output_chunkname="html"
						if(!tagdir) // only output the root as single files
						{
							await plated.output.remember_and_write( merged_chunks )
						}
						var cache_root=merged_chunks._root
						delete merged_chunks._root // do not expand_root here, leave it for later so relative path works
						chunks._body=plated.chunks.replace( plated.chunks.delimiter_wrap_str("_blog_post_body_many"),merged_chunks); // prebuild body
						posts_body[idx]=plated.chunks.merge_namespace(chunks);
						merged_chunks._root=cache_root

						console.log(timestr()+" BLOGPOST "+fname)
					}

					var pageidx=1;
					var pagename=plated.files.filename_to_dirname(blog[0]._sourcename)+tagdir+"/index.html";
					var pagename_older;
					var pagename_newer;
					for( var postidx=0 ; postidx<posts.length ; postidx+=blog_json.posts_per_page )
					{
						pageidx++;
						pagename_older=plated.files.filename_to_dirname(blog[0]._sourcename)+tagdir+"/page"+pageidx+".html";

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
						if(postidx==0) // export the first page of posts to global visibility
						{
							blog[0]._blog_export=list
						}

						var fname=pagename
						var chunks={};
						
						plated.files.set_source(chunks,fname)

						chunks._list=list;
						chunks._blog_page_older=pagename_older && ("{_root}"+pagename_older);
						chunks._blog_page_newer=pagename_newer && ("{_root}"+pagename_newer);

						chunks.body=plated.chunks.delimiter_wrap_str("_blog_page_body");

						plated.files.prepare_namespace(fname); // prepare merged namespace
						var merged_chunks=plated.chunks.merge_namespace(chunks);

						merged_chunks._output_filename=plated.files.filename_to_output(fname)
						merged_chunks._output_chunkname="html"
						await plated.output.remember_and_write( merged_chunks )

						console.log(timestr()+" BLOG "+fname)

						pagename_newer=pagename;
						pagename=pagename_older;
					}
				
					var feed={}

					feed.version="https://jsonfeed.org/version/1"
					feed.title=blog_json.title
					feed.home_page_url=blog_json.url
					feed.feed_url=blog_json.url+plated.files.filename_to_dirname(blog[0]._sourcename)+tagdir+"/feed.json"

					if(blog_json.feed)
					{
						for(var n in blog_json.feed)
						{
							feed[n]=blog_json.feed[n]
						}
					}
					feed.items=[] // force this to empty just in case

					for(var i=0 ; i<blog_json.posts_per_feed ; i++ )
					{
						var chunks=posts_body[i]
						if(chunks)
						{
							var cache_root=chunks._root
							chunks._root=blog_json.url
							
							var it={};
							
							it.title=chunks._blog_post_json.title
							if(chunks._blog_post_json.author)
							{
								it.author={name:chunks._blog_post_json.author}
							}
							if(chunks._blog_post_json.tags)
							{
								it.tags=chunks._blog_post_json.tags
							}
							it.url=plated.chunks.replace( plated.chunks.delimiter_wrap_str( "_dirname" ) , chunks )
							it.id=it.url // id and url can be the same
							it.content_html=plated.chunks.replace( plated.chunks.delimiter_wrap_str( "_body" ) , chunks )
							it.date_published=(new Date(chunks._blog_post_json.unixtime*1000)).toISOString()


							if(chunks._blog_post_json.feed)
							{
								for(var n in chunks._blog_post_json.feed)
								{
									it[n]=chunks._blog_post_json.feed[n]
								}
							}

							feed.items.push(it);

							chunks._root=cache_root
						}
					}
					var fname=plated.files.filename_to_output(plated.files.filename_to_dirname(blog[0]._sourcename))

					console.log(timestr()+" BLOGFEED "+fname+tagdir+"/feed.json")

					await plated.files.write(
						plated.files.joinpath( opts.output , fname+tagdir+"/feed.json"),
						JSON_stringify(feed,{space:1}) )
					await plated.files.write(
						plated.files.joinpath( opts.output , fname+tagdir+"/feed.xml") ,
						jsonfeedToAtom(feed) )
				}
			}

// write pages of multiple blog posts
		}
		
		return dirs;
	};


/***************************************************************************
--[[#js.plated_plugin.blog.process_file

	chunks = plated_plugin_blog.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be available.

]]*/
	plated_plugin_blog.process_file=function(chunks){
		
// process blog_json
		var chunk=chunks._blog_json;
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			chunk.dir            = chunk.dirname        || chunks._sourcename ;
			for(var n in plated_plugin_blog.config)
			{
				if( "object" == typeof (plated_plugin_blog.config[n]) ) // one level deep copy
				{
					chunk[n] = chunk[n] || {} ;
					if( "object" == typeof (chunk[n]) ) // sanity
					{
						for(var nn in plated_plugin_blog.config[n])
						{
							chunk[n][nn]=chunk[n][nn] || plated_plugin_blog.config[n][nn]
						}
					}
				}
				else
				{
					chunk[n] = chunk[n] || plated_plugin_blog.config[n] ;
				}
			}
			
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
