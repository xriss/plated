

var fs = require('fs');
var util=require('util');
var path=require('path');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }


exports.create=function(opts){

	var plated={};
	
	var plated_files =plated.files =require("./plated_files.js" ).create(opts);
	var plated_chunks=plated.chunks=require("./plated_chunks.js").create(opts);

	plated.build=function()
	{
		ls(opts);

		plated_files.empty_folder(opts.output);
		
		plated_files.find_files(opts.source,"",function(s){

				console.log(opts.source+s , "->", opts.output+s);

				try { fs.mkdirSync( path.dirname(opts.output+s) ); } catch(e){}
				
				fs.writeFileSync(opts.output+s, fs.readFileSync(opts.source+s));

		});
	};


	plated.build_old=function()
	{

	deleteFolderRecursive = function(path) {
		var files = [];
		if( fs.existsSync(path) ) {
			files = fs.readdirSync(path);
			files.forEach(function(file,index){
				var curPath = path + "/" + file;
				if(fs.lstatSync(curPath).isDirectory()) { // recurse
					deleteFolderRecursive(curPath);
				} else { // delete file
					fs.unlinkSync(curPath);
				}
			});
			fs.rmdirSync(path);
		}
	};

		deleteFolderRecursive("static");
		try { fs.mkdirSync("static"); } catch(e){}

		var tongues=[];
		var chunks={};
		var blogs={};
		var chunkopts={};
		
		chunkopts.root="/";  //

		if( argv.root ) { chunkopts.root=argv.root; }


		var dirname="text";
		var ff=fs.readdirSync(dirname);
		for(var i=0;i<ff.length;i++)
		{
			var v=ff[i];
			if( v.length==7 && ( v.slice(-4)==".txt") ) // xxx.txt tongue files
			{
				var t=v.slice(0,3);
				tongues[t]=tongues[t] || {};
				plated_chunks.fill_chunks( fs.readFileSync(dirname+"/"+t+".txt",'utf8'),tongues[t]);
				console.log("Adding "+t+" tongue");
			}
			else // normal chunks
			{
				console.log("Reading "+"/"+v);
				plated_chunks.fill_chunks(fs.readFileSync(dirname+"/"+v,'utf8'),chunks);
			}
		}
		var pages={};
		var get_page_chunk=function(fname)
		{
			if(pages[fname]) { return pages[fname]; }
			var s
			try { s=fs.readFileSync("html/"+fname,'utf8'); } catch(e){}
			if(s)
			{
				pages[fname]=plated_chunks.fill_chunks(s);
			}
			return pages[fname];
		}
		
		var find_pages=function(dir,blog)
		{
			var dirs=dir.split("/"); while( dirs[dirs.length-1]=="" ) { dirs.pop(); }
			var ff=fs.readdirSync("html/"+dir);

			plated_chunks.reset_namespace();
			plated_chunks.push_namespace(chunkopts);
			plated_chunks.push_namespace(chunks);
			
	//		console.log("namespace /");
			plated_chunks.push_namespace( get_page_chunk("index.html") );
			for(var i=0;i<dirs.length;i++)
			{
				var dd=[];
				for(var j=0;j<=i;j++) { dd.push(dirs[j]); }
				var ds=dd.join("/");
				if(ds!="") // skip ""
				{
	//				console.log("namespace /"+dd);
					plated_chunks.push_namespace( get_page_chunk(dd+"/index.html") );
				}
			}


			var dodir=function(tongue)
			{
				var tonguedir=tongue;

				if(tongue=="eng")
				{
					tonguedir="";
				}
				else
				{
					tonguedir=tongue+"/";
				}

				chunkopts.tongue=tongue;
				chunkopts.tongue_root=chunkopts.root+tonguedir;
				
				try { fs.mkdirSync("static/"+tonguedir+dir); } catch(e){}
				for(var i=0;i<ff.length;i++) //parse
				{
					var name=ff[i];
					if( ! fs.lstatSync("html/"+dir+name).isDirectory() )
					{
						var blogdate=false;
						var namedash = name.split('-');
						if(namedash[0]&&namedash[1]&&namedash[2]&&namedash[3]) // looks like a date?
						{
							blogdate=Date(namedash[0], namedash[1]-1, namedash[2]);
						}
						if( (!blog) || (blog && blogdate) ) // in blogmode, only parse files with a date at the start
						{
							console.log("parseing "+tonguedir+dir+name+(blog?" as blogpost":""));
							var page=get_page_chunk(dir+name);
							page._extension=name.split('.').pop();;
							page._filename=name;
							page._fullfilename=dir+name;
							if(blog)
							{
								page._date=namedash[0]+"-"+namedash[1]+"-"+namedash[2];
								page._name="";for(var pi=3;pi<namedash.length;pi++) { page._name+=" "+namedash[pi]; }
								blogs[ dir+name ]=page;
							}
							else
							{
								page.it=page;
								if(page[page._extension]) // only write if we have the main chunk
								{
									var html=plated_chunks.replace("{"+page._extension+"}",page);
									fs.writeFileSync("static/"+tonguedir+dir+name,html);
								}
							}
						}
					}
				}
			}

			if(tongues.eng) { plated_chunks.push_namespace(tongues.eng); }
			dodir("eng");
			if(tongues.eng) { plated_chunks.pop_namespace(); }
			
			if(!blog) // not on blog scan
			{
				for(var n in tongues)
				{
					if(n!="eng") // english is special default dealt with above
					{
						try { fs.mkdirSync("static/"+n); } catch(e){}
						plated_chunks.push_namespace(tongues[n]);
						dodir(n);
						plated_chunks.pop_namespace();
					}
				}
			}
			
			for(var i=0;i<ff.length;i++) // recurse
			{
				var name=ff[i];
				
				if( fs.lstatSync("html/"+dir+name).isDirectory() )
				{
	//				console.log("scan  "+dir+name);
					find_pages(dir+name+"/",blog);
				}
			}

		}

		find_pages("",true); // find blogs first, blogs begin with a 2000-12-31-title.html style 
		
		var bloglist=[];
		for(var n in blogs)
		{
			bloglist.push(blogs[n]);
		}
		bloglist.sort(function(a,b){return a._fullfilename<b._fullfilename?1:-1;});
		
		var b5=[];
	//	for(var i=bloglist.length-1; (i>=0) && (i>=(bloglist.length-5)) ;i--)
		for(var i=0;i<5;i++)
		{
			if(bloglist[i])
			{
				b5.push(bloglist[i])
			}
		}

		chunkopts["bloglist"]=bloglist;
		chunkopts["bloglist_last5"]=b5;

	// auto update the publisher chunk
		var pubs=[];
		for(var id in json_iati_codes["publisher_names"])
		{
			var name=json_iati_codes["publisher_names"][id];
			var d={name:name,id:id};
			pubs.push(d);
		}
		pubs.sort(function(a, b) {
			var ta = a.name.toUpperCase();
			var tb = b.name.toUpperCase();
			return (ta < tb) ? -1 : (ta > tb) ? 1 : 0 ;
		});
		chunkopts["publishers"]=pubs;

	// auto update the countries chunk
		var ccs=[];
		for(var id in json_iati_codes["crs_countries"])
		{
			var name=json_iati_codes["country"][id];
			if(name)
			{
				var d={name:name,id:id};
				ccs.push(d);
			}
		}
		ccs.sort(function(a, b) {
			var ta = a.name.toUpperCase();
			var tb = b.name.toUpperCase();
			return (ta < tb) ? -1 : (ta > tb) ? 1 : 0 ;
		});
		chunkopts["countries"]=ccs;
		
		
		chunkopts["publisher_names_json"]=JSON.stringify( json_iati_codes["publisher_names"] );
		chunkopts["country_names_json"]=JSON.stringify( json_iati_codes["country"] );
		chunkopts["crs_countries_json"]=JSON.stringify( json_iati_codes["crs_countries"] );


		find_pages("")

	// copy raw files into static

		var copyraw=function(root,dir)
		{
			try { fs.mkdirSync("static/"+dir); } catch(e){}

			var ff=fs.readdirSync(root+dir);
			for(var i=0;i<ff.length;i++) // recurse
			{
				var name=ff[i];
				
				if( fs.lstatSync(root+dir+name).isDirectory() )
				{
					copyraw(root,dir+name+"/");
				}
				else
				{
					console.log("rawfile "+root+dir+name);
					fs.writeFileSync("static/"+dir+name, fs.readFileSync(root+dir+name));
				}
			}
		}

		copyraw("../ctrack/","art/");
		copyraw("../ctrack/","jslib/");
		copyraw("./raw/","");
		copyraw("./","art/");

	};

	return plated;
}
