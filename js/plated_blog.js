
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var plated_blog={};
	
	
// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_blog.process_dirs=function(dirs){
		
		var blogs={};
		
		for( var dirname in dirs ) { var chunks=dirs[dirname];
			
			var found={};
			
			// check for special trigger chunks
			for( n in chunks.__flags__ )
			{
				var flags=chunks.__flags__[n];
				var chunk=chunks[n];
				
				if( flags.form=="blog_post" )
				{
					found.blog_post=chunk;
				}
				else
				if( flags.form=="blog" )
				{
					found.blog=chunk;
				}
			}
			
			if(found.blog)
			{
				var blogdata={};
				blogs[dirname]=blogdata;
				blogdata.blog=found.blog
				blogdata.chunks=chunks;
			}

			if(found.blog_post) // add a new page
			{
				var blogdata;
				for( var blogname in blogs )
				{
					if( dirname.substr(0, blogname.length) == blogname ) // found
					{
						blogdata=blogs[blogname]
						break;
					}
				}
				blogdata.posts=blogdata.posts || [];
				var pagedata={};
				pagedata.blog_post=found.blog_post;
				pagedata.chunks=chunks;
				blogdata.posts.push(pagedata)
			}

		}
		
		ls(blogs);
		
		return dirs;
	};


// tweak a single file of chunks, all parent base chunks will have been cascaded/merged into this set of chunks and default formatting already applied
	plated_blog.process_file=function(chunks){
		
		// apply flags to the formatting
		for( n in chunks.__flags__ )
		{
			var flags=chunks.__flags__[n];
			var chunk=chunks[n];

			if( flags.form=="blog" )
			{
				if( "string" == typeof (chunk) )
				{
					chunk=JSON.parse(chunk);
				}
				chunk.base           = chunk.base           || chunks.__plated__.source ;
				chunk.posts_per_page = chunk.posts_per_page || 5 ;
			}
			else
			if( flags.form=="blog_post" )
			{
				if( "string" == typeof (chunk) )
				{
					chunk=JSON.parse(chunk);
				}
			}

			chunks[n]=chunk;
		}
		
		
		return chunks;
	};


	return plated_blog;
};
