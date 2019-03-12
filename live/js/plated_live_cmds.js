
var plated_live_cmds=exports

var path = require("path")


plated_live_cmds.create=function(plated_live)
{
	// get full path using current CD
	// just return given argument if it begins with a /
	var joincd=function(p)
	{
		if(!p) { return plated_live.opts.cd }
		
		if(p[0]=="/")
		{
			return p
		}
		else
		{
			return path.join(plated_live.opts.cd,p)
		}
	}
	var scan_pfs=async function(root)
	{
		var dat=[]
		
		var walk = async function(dir,dat) // ask pfs ( includes new files )
		{
			var list = await plated_live.pfs.readdir(dir)
			for(var idx in list)
			{
				var file=list[idx]
				var path=dir+"/"+file
				var stat = await plated_live.pfs.stat(path)
				dat.push(path)
				if (stat && stat.type=="dir")
				{
					await walk(path,dat)
				}
			}
		}
		await walk(root,dat)
		
		dat.sort()

		return dat
	}

	var scan_git=async function(gitroot)
	{
		var dat = await plated_live.git.listFiles({ dir: gitroot }) // ask git ( includes deleted files )

		var walk = async function(dir,dat) // ask pfs ( includes new files )
		{
			var list = await plated_live.pfs.readdir(dir||"/")
			var addfile=async function(file)
			{
				var path=dir+"/"+file
				var stat = await plated_live.pfs.stat(path)
				if (stat && stat.type=="dir")
				{
					await walk(path,dat)
				}
				else
				{
					dat.push(path.substring(gitroot.length+1))
				}
			}
			for(var idx in list)
			{
				var file=list[idx]
				if(file!=".git") // ignore .git
				{
					await addfile(file)
				}
			}
		}
		await walk(gitroot,dat)

		dat.sort()

		var dupes=dat
		dat=[]
		var last=""
		for(var i=0;i<dupes.length;i++) // remove dupes, there will be dupes
		{
			var v=dupes[i]
			if(last!=v)
			{
				last=v
				dat.push(v)
			}
		}

		return dat
	}

	var cmds=async function(cmdstr, term)
	{
		var cmd=$.terminal.parse_command(cmdstr)
		cmd.term=term // keep terminal for function calls
		
		var aa=cmds.list
		var a=aa[ cmd.name ]
		while(typeof a=="object") // allow nested objects in list
		{
			aa=a // push
			cmd=$.terminal.parse_command(cmd.rest)
			cmd.term=term
			a=aa[ cmd.name ]
		}
		if(typeof a=="function")
		{
			var r=a(cmd)
			if( (typeof r == "object") && (typeof r.then == "function") ) // handle promise
			{
				var r=await r.catch(error=>{cmd.term.error(error)})
			}
			if(typeof r != "undefined" )
			{
				cmd.term.echo( r )
			}
		}
		else
		{
			if(cmd.name=="")
			{
				cmd.term.error("Type help for available commands.")
			}
			else
			{
				cmd.term.error("Unknown command "+cmd.name)
			}
		}

	}
	
	cmds.list={}	
	cmds.list.git={}

	cmds.list.help=async function(cmd)
	{
		var aa=cmds.list
		for(var i=0;i<cmd.args.length;i++)
		{
			var a=aa[ cmd.args[i] ]
			if(a) { aa=a }
		}
		
		if(typeof aa.help=="string")
		{
			return aa.help
		}
		else
		{
			var list=[]
			for(var n in aa)
			{
				list.push(n)
			}
			list.sort()
			return list.join(" ")
		}
	}
	cmds.list.help.help=`
	help COMMAND
Provide list of commands or information about specific COMMAND.
`

	cmds.list.ls=async function(cmd)
	{
		var p=joincd(cmd.args[0])

		var list = await plated_live.pfs.readdir( p )
		
		if(list)
		{
			var ret=[]
			list.sort()
			ret.push(p)
			for(var i=0;i<list.length;i++)
			{
				var vn=list[i]
				var vp=path.join(p,vn)
				var vs=await plated_live.pfs.stat(vp)
				if(vs && vs.type=="dir")
				{
					vn=vn+"/"
				}
				ret.push("  "+vn)
			}
			return ret.join("\n")
		}
	}
	cmds.list.ls.help=`
	ls PATH
List all files and dirs at PATH.
`

	cmds.list.cd=async function(cmd)
	{
		
		var p=cmd.args[0]
		
		var cd=plated_live.opts.cd
		if(p)
		{
			if( p[0] == "/" ) // replace
			{
				cd=p
			}
			else
			{
				cd=path.join(cd,p)
			}
		}
		cd=path.normalize(cd)
		
		// check dir exists
		var stat = await plated_live.pfs.stat(cd)
		
		if( stat && stat.type=="dir" )
		{
			plated_live.opts.cd=cd
		}
		
		return plated_live.opts.cd
	}
	cmds.list.cd.help=`
	cd
Print current directory.

	cd PATH
Change current directory to PATH.
`

	cmds.list.mkfile=async function(cmd)
	{
		if(!cmd.args[0]) { return "Filename required" }
		
		var path=joincd(cmd.args[0])
		
		var stat = await plated_live.pfs.stat(path).catch(function(){})
		
		if(stat) { return "Filename already exists" }
		
		await plated_live.pfs.writeFile(path,"")

		return "Created file "+path
	}
	cmds.list.mkfile.help=`
	mkfile PATH
Create a new empty file at the given PATH.
`

	cmds.list.build=async function(cmd)
	{
		await plated_live.plated.build()
	}
	cmds.list.build.help=`
	build
build the plated site.
`

	cmds.list.git.status=async function(cmd)
	{
		let gitroot = await plated_live.git.findRoot({ filepath: plated_live.opts.cd })
		var ret=[]
		var d=await scan_git(gitroot)
		for(var i=0;i<d.length;i++)
		{
			var v=d[i]
			let status = await plated_live.git.status({ dir: gitroot , filepath: v })
			if(status!="unmodified")
			{
				ret.push(status.padEnd(11," ")+v)
			}
		}
		if(ret.length==0)
		{
			return d.length+" files unmodified."
		}
		return ret.join("\n")
	}
	cmds.list.git.status.help=`
	git status
Print current status of the git repo.
`

	cmds.list.git.add=async function(cmd)
	{
		let gitroot = await plated_live.git.findRoot({ filepath: plated_live.opts.cd })
		var ret=[]
		var d=await scan_git(gitroot)
		for(var i=0;i<d.length;i++)
		{
			var v=d[i]
			let status = await plated_live.git.status({ dir: gitroot , filepath: v })
			if(status!="unmodified")
			{
				await plated_live.git.add({ dir: gitroot , filepath: v })
				ret.push("Added "+v)
			}
		}
		return ret.join("\n")
	}
	cmds.list.git.add.help=`
	git add 
Add all files to staging.

	git add FILENAME
Add FILENAME to staging.
`

	cmds.list.git.commit=async function(cmd)
	{
		let gitroot = await plated_live.git.findRoot({ filepath: plated_live.opts.cd })
		
		var changes=0 // check for changes
		var d = await plated_live.git.listFiles({ dir: gitroot }) // ask git
		for(var i=0;i<d.length;i++)
		{
			var v=d[i]
			let status = await plated_live.git.status({ dir: gitroot , filepath: v })
			if(status!="unmodified")
			{
				if(status[0]!="*") // not in staging
				{
					changes++
				}
			}
		}

		if(changes>0)
		{
			await plated_live.git.commit(plated_live.gitopts({ dir: gitroot , message: cmd.rest || "." , }))
			return "Commited "+changes+" changed files."
		}
		else
		{
			return "No changed to commit."
		}
	}
	cmds.list.git.commit.help=`
	git commit MESSAGE
Commit staging with optional MESSAGE.
`

	cmds.list.git.pull=async function(cmd)
	{
		let gitroot = await plated_live.git.findRoot({ filepath: plated_live.opts.cd })
		await plated_live.git.pull(plated_live.gitopts({ dir: gitroot }))
	}
	cmds.list.git.pull.help=`
	git pull
Pull changes from remote.
`

	cmds.list.git.push=async function(cmd)
	{
		let gitroot = await plated_live.git.findRoot({ filepath: plated_live.opts.cd })
		await plated_live.git.push(plated_live.gitopts({ dir: gitroot }))
	}
	cmds.list.git.push.help=`
	git push
Push changes to remote.
`

	cmds.list.git.clone=async function(cmd)
	{
		let gitroot = await plated_live.git.findRoot({ filepath: plated_live.opts.cd })
		
		var files=await scan_pfs(gitroot)
		for(var i=files.length-1;i>=0;i--)
		{
			var n=files[i]
			await plated_live.pfs.unlink(n)
		}

		await plated_live.git.clone(plated_live.gitopts({
			dir: gitroot,
			url: plated_live.opts.git_url+plated_live.opts.git_repo,
			ref: 'master',
			singleBranch: true,
			depth: 1
		}))

	}
	cmds.list.git.clone.help=`
	git clone
Replace all current files in this repo, **delete all changes**.

	git clone REPO
Clone the given REPO into our file system.
`

	return cmds
}
