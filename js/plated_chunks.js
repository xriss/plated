
/***************************************************************************
--[[#js.plated_chunks

Manage the chunks of text that are combined into a page.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_chunks = require("./plated_chunks.js").create(opts,plated)

This is called automatically when the plated module is created and the 
return value is made available in plated.chunks note that all of these 
modules are bound together and operate as a group with shared data.

In the future when we talk about this module and its available 
functions we are referring to the return value from this create 
function.

]]*/


var util=require('util');
var marked=require('marked');
var JSON5=require('json5');

// is this crap global?
marked.setOptions({
	renderer:    new marked.Renderer(),
	gfm:         true,
	tables:      true,
	breaks:      false,
	pedantic:    false,
	sanitize:    false,
	smartLists:  true,
	smartypants: false
});

var isArray = function (arg) {
    if (typeof arg === 'object' &&
            ('join' in arg && typeof arg.join === 'function') &&
            ('length' in arg && typeof arg.length === 'number')) {
        return true;
    }
    return false;
}

var nl_to_br=function(t) // lets break markdown
{
	return t.replace(/[\n]+/g,function(found)
		{
			if(found.length>=3) // 3 newlines in a row inserts two <br/> codes,
			{
				return "\n"+(new Array(found.length)).join("<br/>\n")+"\n";
			}
			return found;
		}
	);
}

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){
	
	var plated_chunks={};
	
/***************************************************************************
--[[#js.plated_chunks.delimiter_open_str

	s = plated_chunks.delimiter_open_str()

Return the first half of the opts.delimiter string.

]]*/
	plated_chunks.delimiter_open_str=function(){
		return opts.delimiter.substr(0,opts.delimiter.length/2);
	};

/***************************************************************************
--[[#js.plated_chunks.delimiter_close_str

	s = plated_chunks.delimiter_close_str()

Return the last half of the opts.delimiter string.

]]*/
	plated_chunks.delimiter_close_str=function(){
		return opts.delimiter.substr(opts.delimiter.length/2);
	};
	
/***************************************************************************
--[[#js.plated_chunks.delimiter_wrap_str

	s = plated_chunks.delimiter_wrap_str(s)

Return the given string wrapped in the opts.delimiter string.

]]*/
	plated_chunks.delimiter_wrap_str=function(s){
		return plated_chunks.delimiter_open_str()+s+plated_chunks.delimiter_close_str();
	};

	plated_chunks.namespaces=[]; // array of public namespaces to lookup in

/***************************************************************************
--[[#js.plated_chunks.fill_chunks

	chunks = plated_chunks.fill_chunks(str,chunks)

break a string into chunks ( can merged with or replace other chunks ) 
so chunks can be a previously filled list of chunks that we will 
combine any chunks we find in the string with.

A chunk is defined by a line that begins with #^ this has been chosen 
so as not to be something that occurs by mistake in any language, but 
can be altered either inside the chunk file or via the command line 
opts. Note that any future reference is referring to this default and 
would work with any other string if this has been changed.

A line that begins with #^=## would redefine this from one to the other 
for the remainder of the file and can be changed globally by the option 
opt.hashchunk

The first word after this would be the name of the chunk and can then 
be followed by a number of optional flag arguments like flag=value we 
store these flags in the chunks table using chunks._flags[name]=value 
this includes trimming options and request for how chunks should be 
merged.

A comment begins with #^- and the rest of the line will be ignored.

The flag same=append will cause future chunks of the same name to be 
appended to this chunk rather than replace it. This is useful for CSS 
chunks where we wish to bubble down css values into sub directories.

]]*/
	plated_chunks.fill_chunks=function(str,chunks)
	{
		var chunks=chunks || {};
		chunks._flags=chunks._flags || {}; // special flags chunk chunk, if we have any flags

		var name="";
		var chunk=[];
		var flags; // associated with this chunk
		str.split("\n").forEach(function(l){
				if(l.substr(0,opts.hashchunk.length)==opts.hashchunk)
				{
					if(l[opts.hashchunk.length]=="-") // a comment, ignore
					{
					}
					else
					if(l[opts.hashchunk.length]=="=") // change escape char
					{
						opts.hashchunk=l.substr(opts.hashchunk.length+1).trim(); // use this escape char from now on
					}
					else
					if(l.substr(opts.hashchunk.length,opts.hashchunk.length*2)==opts.hashchunk) // double hash escape?
					{
						chunk.push(l.slice(opts.hashchunk.length)); // double ## escape, only keep one #
					}
					else
					{
						if(name)
						{					
							chunks[name]=chunk.join("\n");
						}
						var words=l.substring(opts.hashchunk.length).split(/\s+/); // split on whitespace
						name="";
						if( (words[0]) && words[0].match(/^[0-9a-zA-Z_\-\.]+$/) ) // a valid chunk name, 
						{
							name=words[0];
						}
						if(name) // ignore this line if the chunkname was invalid
						{
							if(words[1] && (words[1]!="")) // have some flags
							{
								flags=chunks._flags[name];
								if(!flags) // create
								{
									flags={};
									chunks._flags[name]=flags;
									for(var i=1;i<words.length;i++)
									{
										var aa=words[i].split("="); // flags must be -> flag=value 
										if(aa[0]&&aa[1])
										{
											flags[aa[0]]=aa[1]; // add flags
										}
									}
								}
							}
							else
							{
								flags={}; // no flags
							}
							chunk=chunks[name];
							if(chunk==undefined) // create
							{
								chunk=[];
								chunks[name]="";
							}
							else // concat mutliple chunks
							{
								if( flags.same=="append" )
								{
									chunk=[ chunks[name] ];
								}
								else // replace
								{
									chunk=[];
									chunks[name]="";
								}
							}
						}
					}
				}
				else
				{
					chunk.push(l);
				}
			});
		if(name && chunk) // final save if we ended in a chunk
		{					
			chunks[name]=chunk.join("\n");
		}

		return chunks;
	}

/***************************************************************************
--[[#js.plated_chunks.format_chunks

	chunks = plated_chunks.format_chunks(chunks)

Process the chunks according to their flags, a chunk with trim=ends set 
will have white space removed from its beginning and end.

A chunk with form=json will be parsed as json rather than a string. It 
can then be referenced inside chunks using chunk.member style lookups.

A chunk with form=markdown will be processed as markdown and turned 
into a html string.

]]*/
	plated_chunks.format_chunks=function(chunks)
	{
		// apply flags to the formatting
		for( n in chunks )
		{
			var flags=chunks._flags && chunks._flags[n] || {};
			
			if(flags.trim) // trim=ends
			{
				chunks[n]=chunks[n].trim(); // remove whitespace from start/end
			}
			
			if(flags.form) // special format
			{
				if(flags.form=="json")
				{
					if( "string" == typeof (chunks[n]) )
					{
						chunks[n]=JSON5.parse(chunks[n]);
					}
				}
				else
				if(flags.form=="markdown")
				{
					
					chunks[n]=marked(nl_to_br(chunks[n]));
				}
			}

		}
		
		return chunks;
	}

/***************************************************************************
--[[#js.plated_chunks.prepare

	array = plated_chunks.prepare(chunks)

break a string on {data} ready to find the lookup values and do all the 
templating actions. This just gets us an array of string parts we can 
easily parse.
 

]]*/
	plated_chunks.prepare=function(str)
	{
		if(!str) { return undefined; }

		var aa=str.split( plated_chunks.delimiter_open_str() );
		var ar=[];
		
		ar.push(aa[0]);
		for(var i=1;i<aa.length;i++)
		{
			var av=aa[i].split( plated_chunks.delimiter_close_str() );
			if(av.length>=2)
			{
				ar.push( plated_chunks.delimiter_open_str() ); // this string is used to mark the following string as something to replace
				ar.push(av[0]);
				ar.push(av[1]);
				for(var j=2;j<av.length;j++) // multiple close tags?
				{
					ar.push( plated_chunks.delimiter_close_str() +av[j]); // then missing open so just leave it as it was
				}
			}
			else
			{
				ar.push( plated_chunks.delimiter_open_str() +aa[i]); // missing close so just leave it as it was
			}
		}
		return ar;
	}

/***************************************************************************
--[[#js.plated_chunks.reset_namespace

	plated_chunks.reset_namespace()

clear the namespace, a namespace is a list of chunks that will be 
merged together as we descend into directories. The lower or later 
chunks replacing or merging with the previous ones.

]]*/
	plated_chunks.reset_namespace=function()
	{
		plated_chunks.namespaces=[];
	}

/***************************************************************************
--[[#js.plated_chunks.set_namespace

	plated_chunks.set_namespace(values)

Set the namespace to the given value.

]]*/
	plated_chunks.set_namespace=function(n)
	{
		plated_chunks.namespaces=n;
	}

/***************************************************************************
--[[#js.plated_chunks.push_namespace

	plated_chunks.push_namespace(value)

Add this value into the namespaces, we check this namespace as well as 
the current chunk data when filling in chunks.

]]*/
	plated_chunks.push_namespace=function(dat)
	{
		if(dat)
		{
			plated_chunks.namespaces.push(dat);
		}
	}

/***************************************************************************
--[[#js.plated_chunks.pop_namespace

	plated_chunks.pop_namespace(value)

Remove last namespace from top of the stack.

]]*/
	plated_chunks.pop_namespace=function()
	{
		return plated_chunks.namespaces.pop();
	}


/***************************************************************************
--[[#js.plated_chunks.remove_underscorechunks

	newchunks = plated_chunks.remove_underscorechunks(chunks)

Remove any chunks that begin with "_" these are all internal chunks 
used by plated code. The user should not be creating any chunks whose 
names begin with an underscore. Also none of these chunks should ever 
bubble down through the heir achy, they belong only to the page in 
which they are created..

A new object full of only chunks that do not begin with an underscore 
is returned.

]]*/
	plated_chunks.remove_underscorechunks=function(chunks)
	{
		var newchunks=[]
		for(var idx in chunks) { var val=chunks[idx];
			if(!idx.startsWith("_"))
			{
				newchunks[idx]=val
			}
		}
		return newchunks
	}

/***************************************************************************
--[[#js.plated_chunks.deepmerge

	too = plated_chunks.deepmerge(frm,too,_flags)

Merge the object, frm, into an object too. How values merge can be 
adjusted by _flags the same way _flags works in parsing chunks. 
same=merge is honoured here so some chunks can be appended rather than 
replace. We need to keep this separate as the act of merging will break 
how such things work.

This function is called recursively so as not to end up sharing values 
with any inputs.

]]*/
	plated_chunks.deepmerge=function(frm,too,_flags){
		for(var idx in frm) { var val=frm[idx];
			if( isArray(val) )
			{
				too[idx] = plated_chunks.deepmerge(val,[]); // recursive deep copy
			}
			else
			if( ( typeof(val) == "object" )  )
			{
				if	(
						( (_flags) && (_flags[idx]) && (_flags[idx].same=="merge") ) // we should merge json data
						||
						( (_flags) && (val==_flags) ) // flags need merging
					)
				{
					too[idx] = plated_chunks.deepmerge(val,too[idx] || {}); // merge the object
				}
				else
				{
					too[idx] = plated_chunks.deepmerge(val,{}); // recursive deep copy
				}
			}
			else
			if( (_flags) && (_flags[idx]) && (_flags[idx].same=="append") ) // we should append
			{
				if(too[idx])
				{
					too[idx]=too[idx] + "" + val; // append strings
				}
				else
				{
					too[idx]=val;
				}
			}
			else // replace
			{
				too[idx]=val;
			}
		}
		return too;
	};


/***************************************************************************
--[[#js.plated_chunks.merge_namespace

	chunks = plated_chunks.merge_namespace(dat)

Merge all of the namespaces together, along with the dat, then return 
this new set of chunks for easy lookup it should be safe to modify the 
output merged chunks without accidentally changing anything in the 
namespace.

This gives us a final chunks object that we can use to build the output 
page.

]]*/
	plated_chunks.merge_namespace=function(dat)
	{		
		var chunks={};
		
		for(var i=0;i<plated_chunks.namespaces.length;i++) // last added has priority
		{ 
			plated_chunks.deepmerge(plated_chunks.namespaces[i],chunks,plated_chunks.namespaces[i]._flags);
		}
		
		plated_chunks.deepmerge(dat,chunks,dat._flags);

		return chunks;
	};

/***************************************************************************
--[[#js.plated_chunks.lookup

	chunks = plated_chunks.lookup(str,dat)

lookup the string inside dat, the string can use dot notation such as 
parent.member to lookup a value inside an object.

Numbers can also be used to reverence arrays such as array.0 or array.1 
and negative indexes such as array.-1 can be used to fetch the last 
value from the array.

]]*/
	plated_chunks.lookup=function(str,dat)
	{
		if( dat[str] !== undefined ) // simple check
		{
			return dat[str];
		}
		var i=str.indexOf('.');
		if(i>=0)
		{
			var a1=str.substring(0,i);
			if("object" == typeof dat[a1] ) // try a sub lookup 
			{
				var a2=str.substring(i+1);
				if(a2[0]=="-") { a2=""+(dat[a1].length+Number(a2)); } // so -1 can get last from an array
				return plated_chunks.lookup(a2,dat[a1])
			}
		}
	}

/***************************************************************************
--[[#js.plated_chunks.replace_once

	chunks = plated_chunks.replace_once(str,dat,lastpass)

Parse the str and replace {} values once only using dat values. 
lastpass is a flag as on the lastpass we allow ^ as the first char 
inside the {} to prevent further expansion.

Normally the inside are expanded and then expanded again but since this 
is the last pass we know that will not happen so these tags are safe to 
expand.

]]*/
	plated_chunks.replace_once=function(str,dat,lastpass)
	{
		var aa=plated_chunks.prepare(str);
		
		if(!aa) { return str; }
		
		var depth=0
		
		var r=[];
		
		for(var i=0;i<aa.length;i++)
		{
			var v=aa[i];
			if( v==plated_chunks.delimiter_open_str() ) // next string should be replaced
			{
				v=aa[ ++i ]
				if(depth==0)
				{
					if(v=="[") // open, these are removed on last pass and no expansion happens inside
					{
						if(!lastpass) // dont keep on last pass
						{
							r.push( plated_chunks.delimiter_open_str() +"["+ plated_chunks.delimiter_close_str() )
						}
						depth++
					}
					else
					if(v=="]")//  we have not opened so this is an error...
					{
						r.push( plated_chunks.delimiter_open_str() +"]"+ plated_chunks.delimiter_close_str() )
					}
					else
					if(v=="[".repeat(v.length)) // allow one level of expansion per extra character as this tag shrinks
					{
						r.push( plated_chunks.delimiter_open_str() +v.substring(1)+ plated_chunks.delimiter_close_str() )
					}
					else
					if(v=="]".repeat(v.length)) // allow one level of expansion per extra character as this tag shrinks
					{
						r.push( plated_chunks.delimiter_open_str() +v.substring(1)+ plated_chunks.delimiter_close_str() )
					}
					else
					{
						r.push( plated_chunks.expand_tag(v,dat,lastpass) );
					}
				}
				else // we are inside {[}{]}
				{
					if(v=="[") // keep track of recursion, as long as we are balanced it is safe to nest
					{
						r.push( plated_chunks.delimiter_open_str() +"["+ plated_chunks.delimiter_close_str() )
						depth++
					}
					else
					if(v=="]")// close, these are removed on last pass
					{
						depth--
						if( (!lastpass) && (depth==0) ) // do not keep on last pass
						{
							r.push( plated_chunks.delimiter_open_str() +"]"+ plated_chunks.delimiter_close_str() )
						}
					}
					else // do not expand
					{
						r.push( plated_chunks.delimiter_open_str() +v+ plated_chunks.delimiter_close_str() )
					}
				}
			}
			else
			{
				r.push(v);
			}
		}

		return r.join("");
	}
	
/***************************************************************************
--[[#js.plated_chunks.expand_tag

	value = plated_chunks.expand_tag(v,dat,lastpass)

Do all the magical things that enables a tag to expand, normally we 
just lookup the value inside dat but a few operators can be applied.

Operators are applied from left to right so we have no precedence 
besides this.

If we fail to lookup a valid value then we return input string wrapped 
in delimiters, essentially any values we do not understand will come 
out of the process unscathed  exactly as they went in.

There must be no white space inside {} or we will not process it.

This combined is why we can safely use {} rather than {{}} and any accidental 
use will survive.

]]*/
	plated_chunks.expand_tag=function(v,dat,lastpass)
	{
		var v_unesc=v.split("&amp;").join("&"); //turn html escaped & back into just & so we can let markdown break our tags

		var aa=v_unesc.split(/([^0-9a-zA-Z_\-\.]+)/g); // valid chars for chunk names and indexes

		var last,next;
		var opp="replace";
		for(var i=0;i<aa.length;i++)
		{
			var a=aa[i];
			if(a=="") // when we want to spit out nothing if a value is unset we can end on an empty string eg {value|}
			{
				switch(opp)
				{
					case "and":
						if(last)
						{
							last=a;
						}
					break;
					case "or":
						if(!last)
						{
							last=a;
						}
					break;
					default: // error
						opp="error";
					break;
				}
			}
			else
			if(a.match(/^[0-9a-zA-Z_\-\.]+$/)) // a chunk name
			{
				switch(opp)
				{
					case "replace":
						last=plated_chunks.lookup(a,dat);
					break;
					case "lt":
						next=plated_chunks.lookup(a,dat)
						if(next===undefined) { next=a }
						last=last < next
					break;
					case "lteq":
						next=plated_chunks.lookup(a,dat)
						if(next===undefined) { next=a }
						last=(last <= next)
					break;
					case "gt":
						next=plated_chunks.lookup(a,dat)
						if(next===undefined) { next=a }
						last=(last >  next)
					break;
					case "gteq":
						next=plated_chunks.lookup(a,dat)
						if(next===undefined) { next=a }
						last=(last >= next)
					break;
					case "eq":
						next=plated_chunks.lookup(a,dat)
						if(next===undefined) { next=a }
						last=(last == next)
					break;
					case "and":
						if(last)
						{
							last=plated_chunks.lookup(a,dat);
						}
					break;
					case "or":
						if(!last)
						{
							last=plated_chunks.lookup(a,dat);
						}
					break;
					case "plate":
						next=plated_chunks.lookup(a,dat);
						if(!next)
						{
							opp="error"; // template must be valid
						}
						else
						{
							var dp=[];
							if(isArray(last)) // apply plate to all objects in array
							{
								for(var ii=0;ii<last.length;ii++)
								{
									dp.push( plated_chunks.replace_once(next,
										plated_chunks.deepmerge(dat,{_it:last[ii],_idx:ii+1},dat._flags)
									) );
								}
							}
							else
							if(!last)
							{
								dp.push(""); // false in, is an empty string out
							}
							else // just apply plate to this single object or string
							{
								dp.push( plated_chunks.replace_once(next,
									plated_chunks.deepmerge(dat,{_it:last,_idx:1},dat._flags)
								) );
							}
							last=( dp.join("") ); // join all items
						}
					break;
					default: // error
						opp="error";
					break;
				}
			}
			else // an operator
			{
				switch(a)
				{
					case "<":
						opp="lt";
					break;
					case "<=":
						opp="lteq";
					break;
					case ">":
						opp="gt";
					break;
					case ">=":
						opp="gteq";
					break;
					case "==":
						opp="eq";
					break;
					case "&&":
						opp="and";
					break;
					case "||":
						opp="or";
					break;
					case ":":
						opp="plate";
					break;
					default: // error
						opp="error";
					break;
				}
				
			}
			if(opp=="error") { last=null; break; } // giveup
		}

		if(last==="") { return ""; } // so we can return an empty string
		return last || ( plated_chunks.delimiter_open_str() +v+ plated_chunks.delimiter_close_str() );
	}

/***************************************************************************
--[[#js.plated_chunks.replace

	value = plated_chunks.replace(str,dat)

Repeatedly call replace_once until all things that can expand, have 
expanded, or we ran out of sanity. Sanity is 100 levels of recursion, 
just to be on the safe side.

We then call a final replace_once with the lastpass flag set.

]]*/
	plated_chunks.replace=function(str,dat)
	{
		var check="";
		var sanity=100; // maximum depth of recursion
		while( str != check) //nothing changed on the last iteration so we are done
		{
			check=str;
			str=plated_chunks.replace_once(str,dat,false);
			if(--sanity<0) { break; }
		}
		
// perform a final replace of chunks that should not recurse, these are included like so {^chunkname}
		str=plated_chunks.replace_once(str,dat,true);
		
		return str;
	}
	
/***************************************************************************
--[[#js.plated_chunks.markdown

	html = plated_chunks.markdown(str)

Convert a markdown string to a html string. As a personal quirk We keep 
newlines a little more eagerly than standard markdown allowing some 
control over the spacing between your text.

Markdown is hardly a standard thing, after all.

]]*/
	plated_chunks.markdown=function(s)
	{
		return marked(nl_to_br(s));
	}
		

	return plated_chunks;
};
