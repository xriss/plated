
var plated_live_cmds=exports

plated_live_cmds.inject=function(plated_live)
{
	plated_live.cmds.git={}

	plated_live.cmds.ls=async function(){
		var con=this

		var list = await plated_live.pfs.readdir( plated_live.opts.cd ).catch(error=>{ con.error(error) })
		
		if(list)
		{
			for(var i=0;i<list.length;i++)
			{
				this.echo( list[i] )
			}
		}
	}

	plated_live.cmds.cd=async function( p ){
		var con=this
		
		var cd=plated_live.opts.cd
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
		
		var stat = await plated_live.pfs.stat(cd).catch(error=>{ con.error(error) })
		
		if( stat && stat.type=="dir" )
		{
			plated_live.opts.cd=cd
		}
		
		return plated_live.opts.cd
	}
}
