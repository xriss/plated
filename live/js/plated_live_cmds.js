
var plated_live_cmds=exports

var path = require("path")


plated_live_cmds.create=function(plated_live)
{
	var scan_git=async function(dir)
	{
		var basedir=dir||"/"
		var dat=[]
		var walk = async function(dir,dat)
		{
			var list = await plated_live.pfs.readdir(dir||"/")
				var addfile=async function(file){
				var path=dir+"/"+file
				var stat = await plated_live.pfs.stat(path)
				if (stat && stat.type=="dir")
				{
					await walk(path,dat)
				}
				else
				{
					dat.push(path.substring(basedir.length+1))
				}
			}
			for(idx in list){ var file=list[idx]
				if(file!=".git") // ignore .git
				{
					await addfile(file)
				}
			}
		}
		await walk(basedir,dat)
		dat.sort()

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
		var p=plated_live.opts.cd
		var a=cmd.args[0]
		if(a){ p=path.join(p,a) }

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
	cd PATH
Change current directory to PATH.
`

	cmds.list.git.status=async function(cmd)
	{
		let gitroot = await plated_live.git.findRoot({
		  filepath: plated_live.opts.cd
		})
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
		return ret.join("\n")
	}
	cmds.list.git.status.help=`
	git status
Print current status of the git repo.
`

	return cmds
}
