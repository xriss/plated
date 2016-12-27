
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');
var JSON5=require('json5');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var plated_blog={};
	
	
	plated_blog.config={};

// main settings that you can override in your blog_json config chunk
	plated_blog.config.posts_per_page=5;

// the following chunk names can be altered, if they conflict with chunk names already used (opts)

// special chunk names for blog
	plated_blog.config.blog_json      = opts.blog_json      || "blog_json";
	plated_blog.config.blog_body      = opts.blog_body      || "blog_body"; // this is used on the blogs main index.html ( AKA page1.html )
	plated_blog.config.blog_page_json = opts.blog_page_json || "blog_page_json";
	plated_blog.config.blog_page_body = opts.blog_page_body || "blog_page_body"; // this is used for page2.html , page3.html , etc
	plated_blog.config.blog_post_json = opts.blog_post_json || "blog_post_json";
	plated_blog.config.blog_post_body = opts.blog_post_body || "blog_post_body"; // this is used for each posts index.html	

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
		
		ls(blogs);
		
		return dirs;
	};


// tweak a single file of chunks, only chunks found in this file will be available.
	plated_blog.process_file=function(chunks){
		
// process blog_json
		var chunk=chunks[plated_blog.config.blog_json];
		if( chunk )
		{
			if( "string" == typeof (chunk) ) { chunk=JSON5.parse(chunk) || {}; } // auto json parse
			chunk.dir            = chunk.dir            || chunks.__plated__.source ;
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
				var s=chunk.datetime || chunks.__plated__.source;
				
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
