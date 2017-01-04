
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
	
	plated_chunks.delimiter_open_str=function(){
		return opts.delimiter.substr(0,opts.delimiter.length/2);
	};

	plated_chunks.delimiter_close_str=function(){
		return opts.delimiter.substr(opts.delimiter.length/2);
	};
	
	plated_chunks.delimiter_wrap_str=function(s){
		return plated_chunks.delimiter_open_str()+s+plated_chunks.delimiter_close_str();
	};

	plated_chunks.namespaces=[]; // array of public namespaces to lookup in

	// break a string into chunks ( can be merged or replace other chunks )
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
		if(name && chunk)
		{					
			chunks[name]=chunk.join("\n");
		}

		return chunks;
	}

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

	// break a string on {data} ready to replace
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

	// clear namespace
	plated_chunks.reset_namespace=function()
	{
		plated_chunks.namespaces=[];
	}

	// set namespace
	plated_chunks.set_namespace=function(n)
	{
		plated_chunks.namespaces=n;
	}

	// add this dat into the namespaces that we also check when filling in chunks
	plated_chunks.push_namespace=function(dat)
	{
		if(dat)
		{
			plated_chunks.namespaces.push(dat);
		}
	}

	// remove last namespace from top of stack
	plated_chunks.pop_namespace=function()
	{
		return plated_chunks.namespaces.pop();
	}


// merge all of the namespaces together, along with the dat, then return this new set of chunks for easy lookup
// it should be safe to modify the output merged chunks without accidentally changing anything in the namespace.
	plated_chunks.merge_namespace=function(dat)
	{
		var deepmerge=function(frm,too,_flags){
			for(var idx in frm) { var val=frm[idx];
				if( isArray(val) )
				{
					too[idx] = deepmerge(val,[]); // recursive deep copy
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
						too[idx] = deepmerge(val,too[idx] || {}); // merge the object
					}
					else
					{
						too[idx] = deepmerge(val,{}); // recursive deep copy
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
		
		var chunks={};
		
		for(var i=0;i<plated_chunks.namespaces.length;i++) // last added has priority
		{ 
			deepmerge(plated_chunks.namespaces[i],chunks,plated_chunks.namespaces[i]._flags);
		}
		
		deepmerge(dat,chunks,dat._flags);

		return chunks;
	};

	// lookup only in dat
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

	// replace once only using dat
	plated_chunks.replace_once=function(str,dat,lastpass)
	{
		var aa=plated_chunks.prepare(str);
		
		if(!aa) { return str; }
		
		var r=[];
		
		for(var i=0;i<aa.length;i++)
		{
			var v=aa[i];
			if( v==plated_chunks.delimiter_open_str() ) // next string should be replaced
			{
				r.push( plated_chunks.expand_tag(aa[ ++i ],dat,lastpass) );
			}
			else
			{
				r.push(v);
			}
		}

		return r.join("");
	}
	
	plated_chunks.expand_tag=function(v,dat,lastpass)
	{
		var v_unesc=v.split("&amp;").join("&"); //turn html escaped & back into just & so we can let markdown break our tags
		
		if(v_unesc[0]=="^") // only expand once, on last pass, 
		{
			if(lastpass)
			{
				v_unesc=v_unesc.substring(1);
			}
			else
			{
				return ( plated_chunks.delimiter_open_str() +v+ plated_chunks.delimiter_close_str() );
			}
		}
		
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
									dp.push( plated_chunks.replace_once(next,{_it:last[ii],_idx:ii+1}) );
								}
							}
							else
							if(!last)
							{
								dp.push(""); // false in, is an empty string out
							}
							else // just apply plate to this single object or string
							{
								dp.push( plated_chunks.replace_once(next,{_it:last,_idx:1}) );
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
					case "&":
						opp="and";
					break;
					case "|":
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

	// repeatedly replace untill all things that can expand, have expanded, or we ran out of sanity
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

	return plated_chunks;
};
