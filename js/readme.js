
var util=require('util');
var path=require('path');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

exports.create=async function(opts,readme){
	readme=readme || {};
	 // allow any custom promise based file system
	readme.pfs=readme.pfs || 	(require("pify"))(require('fs'))
	
// force defaults if they are missing
	opts = opts || {} 
	
	opts.ignore=opts.ignore || {
		"node_modules":true,
		"readme.md":true,
	}
	opts.head=opts.head||"--[[#"
	opts.foot=opts.foot||"]]"
	opts.split=`

---
			
The following text is automatically extracted from other files in this 
directory and should not be edited here.

---

`


	readme.setup=async function(opts)
	{
		readme.plated_files=require("./plated_files.js" ).create(opts,readme)

		let plated_files=readme.plated_files
		
		let dirs={}
		for(let i=1 ; i<opts._.length ; i++) // all args are the dirs 
		{
			dirs[opts._[i]]=true
		}

		for( let busy=true ; busy ; )
		{
			busy=false // flag this if we are still finding new dirs
			for(let dir in dirs)
			{
				let files ;	try{ files=await plated_files.readdir( dir ) }catch(e){}
				for(let file of (files||[]))
				{
					if( file.startsWith(".") || opts.ignore[file] ) // ignore 
					{
					}
					else
					{
						let v=plated_files.joinpath(dir,file)
						let st ; try{ st=await plated_files.stat( v ) }catch(e){}
						if( st && plated_files.stat_isDirectory(st) )
						{
							if(!dirs[v]) // adding new
							{
								busy=true
								dirs[v]=true
							}
						}
					}
				}
			}
		}
		opts.dirs=[]
		for(let dir in dirs)
		{
			opts.dirs.push(dir)
		}

	}

	readme.build=async function()
	{
		let pfs=readme.pfs
		let plated_files=readme.plated_files
		let dirs=[]
		for(let dir of opts.dirs)
		{
//			let readme=plated_files.joinpath(dir,"readme.md")
//			if( await plated_files.exists(readme) )
//			{
				dirs.push(dir)
//			}
		}

		for(let dir of dirs)
		{
			let chunks={}

			let files ;	try{ files=await plated_files.readdir( dir ) }catch(e){}
			for(let file of (files||[]))
			{
				if( file.startsWith(".") || opts.ignore[file] ) { continue } // ignore 

				let v=plated_files.joinpath(dir,file)
				let d ; try{ d=await pfs.readFileSync(v, "utf-8") }catch(e){}
				d=d || ""

				let lines=d.split("\n")
				let chunk=null
				for( let line of lines )
				{
					if(line.startsWith(opts.head))
					{
						let name=line.substr( opts.head.length ).trim()
						if( (/^[0-9a-zA-Z_\-\.]+$/).test(name) ) // valid chunk name
						{
							chunk=[]
							chunks[name]=chunk
						}
					}
					else
					if(line.startsWith(opts.foot))
					{
						chunk=null
					}
					else
					if(chunk)
					{
						chunk.push(line)
					}
				}
			}


			let readme=plated_files.joinpath(dir,"readme.md")
			let d ; try{ d=await pfs.readFile(readme, "utf-8") }catch(e){}
			d=d || ""
			let aa=d.split(opts.split)
			aa=[ aa[0] ]
			
			let names=[]
			for(let name in chunks ){ names.push(name) }
			names.sort()
			if(names.length==0){continue} // nothing to add
			
			aa.push(opts.split)
			
			for(let name of names)
			{
				let s="\n\n\n## "+name+"\n\n"+chunks[name].join("\n")
				aa.push(s)
			}
			d=aa.join("")

			console.log(readme)

			pfs.writeFile(readme,d)

		}
		

	}

	await readme.setup(opts);
	return readme;
}
