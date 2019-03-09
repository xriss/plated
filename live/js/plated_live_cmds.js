
var plated_live_cmds=exports

var path = require("path")


plated_live_cmds.create=function(plated_live)
{
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
				var r=await r
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
			cmd.term.echo(aa.help)
		}
		else
		{
			var list=[]
			for(var n in aa)
			{
				list.push(n)
			}
			list.sort()
			cmd.term.echo(list.join(" "))
		}
	}
	cmds.list.help.help="help COMMAND\n\
Provide list of commands or information about specific COMMAND."

	cmds.list.ls=async function(cmd)
	{
		var p=plated_live.opts.cd
		var a=cmd.args[0]
		if(a){ p=path.join(p,a) }

		var list = await plated_live.pfs.readdir( p ).catch(error=>{cmd.term.error(error)})
		
		if(list)
		{
			list.sort()
			cmd.term.echo(p)
			for(var i=0;i<list.length;i++)
			{
				var vn=list[i]
				var vp=path.join(p,vn)
				var vs=await plated_live.pfs.stat(vp).catch(error=>{cmd.term.error(error)})
				if(vs && vs.type=="dir")
				{
					vn=vn+"/"
				}
				cmd.term.echo("  "+vn)
			}
		}
	}
	cmds.list.ls.help="ls PATH\n\
List all files and dirs at PATH."

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
		var stat = await plated_live.pfs.stat(cd).catch(error=>{cmd.term.error(error)})
		
		if( stat && stat.type=="dir" )
		{
			plated_live.opts.cd=cd
		}
		
		return plated_live.opts.cd
	}
	cmds.list.cd.help="cd PATH\n\
Change current directory to PATH."

	return cmds
}
