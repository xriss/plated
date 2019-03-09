
var plated_live_cmds=exports


plated_live_cmds.create=function(plated_live)
{
	var cmds=async function(cmdstr, term)
	{
		var cmd=$.terminal.parse_command(cmdstr)
		cmd.term=term
		
		console.log(cmd)
		
		var aa=cmds.list
		var a=aa[ cmd.name ]
		while(typeof a=="object") // allow nested objects in command list
		{
			aa=a
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
			cmd.term.error("unknown command "+cmd.name)
		}

	}
	
	cmds.list={}	
	cmds.list.git={}

	cmds.list.ls=async function(cmd){

		var list = await plated_live.pfs.readdir( plated_live.opts.cd ).catch(error=>{ cmd.term.error(error) })
		
		if(list)
		{
			for(var i=0;i<list.length;i++)
			{
				cmd.term.echo( list[i] )
			}
		}
	}

	cmds.list.cd=async function( cmd ){
		
		var p=cmd.args[0]
		
		var cd=plated_live.opts.cd

		if(p)
		{
			if( p[0] == "/" )
			{
				cd=p
			}
			else
			if( p == ".." )
			{
				var l=cd.lastIndexOf("/")
				if(l>0)
				{
					cd=cd.substring(0,l)
				}
				else
				{
					cd="/"
				}
			}
			else
			{
				if( cd[cd.length-1]=="/" )
				{
					cd=cd+p
				}
				else
				{
					cd=cd+"/"+p
				}
			}
		}
		
		var stat = await plated_live.pfs.stat(cd).catch(error=>{ cmd.term.error(error) })
		
		if( stat && stat.type=="dir" )
		{
			plated_live.opts.cd=cd
		}
		
		return plated_live.opts.cd
	}

	return cmds
}
