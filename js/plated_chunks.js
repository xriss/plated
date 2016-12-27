
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

	plated_chunks.namespaces=[]; // array of public namespaces to lookup in

	// break a string into chunks ( can be merged or replace other chunks )
	plated_chunks.fill_chunks=function(str,chunks)
	{
		var hashchar=(opts.hashchar || "#")[0];
		var chunks=chunks || {};
		chunks.__flags__=chunks.__flags__ || {}; // special flags chunk chunk, if we have any flags

		var name="";
		var chunk=[];
		var flags; // associated with this chunk
		str.split("\n").forEach(function(l){
				if(l[0]==hashchar)
				{
					if(l[1]=="=") // change escape char
					{
						hashchar=l[2]; // use this escape char from now on
					}
					else
					if(l[1]==hashchar) // double hash escape?
					{
						chunk.push(l.slice(1)); // double ## escape, only keep one #
					}
					else
					{
						if(name)
						{					
							chunks[name]=chunk.join("\n");
						}
						var words=l.substring(1).replace(/\s+/g, " ").split(" "); // allow any type of whitespace
						name=words[0];
						if(name)
						{
							if(words[1] && (words[1]!="")) // have some flags
							{
								flags=chunks.__flags__[name];
								if(!flags) // create
								{
									flags={};
									chunks.__flags__[name]=flags;
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
		for( n in chunks.__flags__ )
		{
			var flags=chunks.__flags__[n];
			
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

		var aa=str.split("{");
		var ar=[];
		
		ar.push(aa[0]);
		for(var i=1;i<aa.length;i++)
		{
			var av=aa[i].split("}");
			if(av.length>=2)
			{
				ar.push("{"); // this string is used to mark the following string as something to replace
				ar.push(av[0]);
				ar.push(av[1]);
				for(var j=2;j<av.length;j++) // multiple close tags?
				{
					ar.push("}"+av[j]); // then missing open so just leave it as it was
				}
			}
			else
			{
				ar.push("{"+aa[i]); // missing close so just leave it as it was
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
		var deepmerge=function(frm,too,__flags__){
			for(var idx in frm) { var val=frm[idx];
				if( ( typeof(val) == "array" ) )
				{
					too[idx] = deepmerge(val,[]); // recursive deep copy
				}
				else
				if( ( typeof(val) == "object" )  )
				{
					if	(
							( (__flags__) && (__flags__[idx]) && (__flags__[idx].same=="merge") ) // we should merge json data
							||
							( (__flags__) && (val==__flags__) ) // flags need merging
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
				if( (__flags__) && (__flags__[idx]) && (__flags__[idx].same=="append") ) // we should append
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
			deepmerge(plated_chunks.namespaces[i],chunks,plated_chunks.namespaces[i].__flags__);
		}
		
		deepmerge(dat,chunks,dat.__flags__);
		
//		chunks.__flags__=undefined; // no flags available after chunks have been merged

		return chunks;
	};

	// lookup only in dat
	plated_chunks.lookup=function(str,dat)
	{
		if( dat[str] !== undefined ) // simple check
		{
			return dat[str];
		}
		//todo add sub array . notation split and lookup
		var i=str.indexOf('.');
		if(i>=0)
		{
			var a1=str.substring(0,i);
			if("object" == typeof dat[a1] ) // try a sub lookup 
			{
				var a2=str.substring(i+1);
				return plated_chunks.lookup(a2,dat[a1])
			}
		}
	}

	// replace once only using dat
	plated_chunks.replace_once=function(str,dat)
	{
		var aa=plated_chunks.prepare(str);
		
		if(!aa) { return str; }
		
		var r=[];
		
		for(var i=0;i<aa.length;i++)
		{
			var v=aa[i];
			if( v=="{" ) // next string should be replaced
			{
				i++;
				v=aa[i];
				var v2 = v.split(":");
				if( v2[1] ) // have a : split, need both data and plate
				{
					var d=plated_chunks.lookup( v2[0],dat );
					var p=plated_chunks.lookup( v2[1],dat );
					if( ("object" == typeof d) && ("string" == typeof p) )
					{
						var dp=[];
						if(d.length) // apply plate to all objects in array
						{
							for(var ii=0;ii<d.length;ii++)
							{
								dp.push( plated_chunks.replace_once(p,{it:d[ii],idx:ii+1}) );
							}
						}
						else // just apply plate to this object
						{
							dp.push( plated_chunks.replace_once(p,{it:d,idx:1}) );
						}
						r.push( dp.join("") ); // join and push
					}
					else // fail lookup
					{
						r.push( "{"+v+"}" );
					}
				}
				else
				{
					var d=plated_chunks.lookup( v,dat );
					if( d == undefined )
					{
						r.push( "{"+v+"}" );
					}
					else // fail lookup
					{
						r.push( d );
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

	// repeatedly replace untill all things that can expand, have expanded, or we ran out of sanity
	plated_chunks.replace=function(str,dat)
	{
		var check="";
		var sanity=100;
		while( str != check) //nothing changed on the last iteration so we are done
		{
			check=str;
			str=plated_chunks.replace_once(str,dat);
			if(--sanity<0) { break; }
		}
		
// TODO: perform a final replace of chunks that should not recurse, these are included like so {.chunkname}
		
		return str;
	}

	return plated_chunks;
};
