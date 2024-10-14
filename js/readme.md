# Plated

Currently in development.

Please see github for info.

https://github.com/xriss/plated




---
			
The following text is automatically extracted from other files in this 
directory and should not be edited here.

---




## cmd.plated


	plated

The commandline interface to plated, the options passed into this 
command are actually the same as the options passed into the opt object 
when creating the js.plated module.



## cmd.plated.build


	plated build 
	
The build action, output files are created once and then the command 
returns.

	--site=
	
How we should link to this site if the link can not be relative, eg 
normally we would just use /index.html to reach a file in the root of 
the current site but if this html is going to be rendered somewhere 
else then this trick would no longer work and we would have to use this 
value instead. An example of when this might happen is the publishing of 
rss feeds.

	--root=

The root of the site we are building, normally empty in which case we 
maintain a relative path back to the root depending on how far we have 
descended into the directory structure, eg ../../ It is recomended that 
this be used whenever constructing a url, for instance linking to the 
root index.html should be done like sp {_root}index.html rather than 
/index.html if you want to ensure you have a site that can be built 
into a directory as well as a domain.

	--source=source
	
Where to read the source files from, this is relative to the current 
directory and all files are found recursively from this point. We also 
follow soft directory symlinks so we can easily pull in extra files from 
elsewhere.

	--output=output

The output directory relative to the current directory. Please be very 
careful with this location as this will be emptied recursively before we 
write anything into it.

	--hashfile=^

The magic string used to trigger special chunk parsing, files are 
either scoped to the directory in which case they are just this magic 
string plus any extension. For example ^.html or they are intended to 
create specific files in which case ^. will be stripped and the 
remainder used as an output. For example index.^.html which would 
create an index.html in the output, the extension is used to pick the 
chunk that is rendered into the output file. In this case it would be 
the html chunk.

	--hashchunk=#^

The magic string used to split the input files into chunks, it must be 
used at the start of a line to trigger special processing and the 
default has been specifically chosen as something unlikely to be typed 
by accident.

	--delimiter={}
	
The magic string used to wrap tags for special processing in chunk 
files. We split this string in the middle with the beginning getting 
the larger half of the string from any odd length. This means "${}" 
will work as expected with the opener being "${" and the closer "}". 
The default of "{}", might look dangerous for C like languages which 
use {} to wrap blocks but due to the limits on contents (no white 
space) and the fallback of outputting exactly the same as the input, eg 
{} will output {}. C like languages are very unlikely to trigger any 
special processing. 

	--dumpjson
	
A Boolean flag to enable the output of .json chunk dumps as well as 
processed output files. This is useful for debugging and also provides 
enough data to recreate pages at run time should that be necessary.



## cmd.plated.watch


	plated watch
	
Build once and then watch all the files in source folder with any 
change triggering a rebuild.

This combined with a simple server and being careful to disable the 
html cache, can be used for live updates as you edit the source files.

This uses the same options as plated.build so please view the 
descriptions of all available options there.



## html.plated


Plated operates on a directory structure of files and simply copies the 
files it does not understand into the output. As such you could have an 
almost 100% generic static site with only a few special files getting 
special treatment dependent on their name containing a ^. sequence of 
characters.



## html.plated.chunks


Chunk files are parsed one line at a time to break them into a number 
of named chunks, lines that begin with the special characters #^ 
trigger special processing all other lines are simple assigned to the 
current chunk. eg:

	#^chunkname
	here is some text
	that will be assigned to chunkname

A chunk ends when we run out of file or we start another chunk.

As well as the chunk name we can also add some flags to change how the 
chunk is processed. These flags are added by name=value pairs after the 
chunkname and separated by white space.

	#^chunkname flag=value otherflag=othervalue

These values are intended to change how the chunk is processed here are 
the ones that we currently support. Multiple flags can of course be 
applied to the same chunk.

	#^chunkname trim=ends

This flag will cause all whitespace to be removed from the beginning 
and end of the chunk. Useful if you intend to include a chunk in a html 
attributes as newlines would would mess that up.

	#^chunkname form=json

Parse the text as json, this allows for structured data or arrays to be 
defined in chunks. This data can be referenced inside macro expansion 
using the . operator to reference members. Most plugins have a json 
chunk containing their settings.

	#^chunkname form=markdown

This text will be parsed as markdown and converted into html. Markdown 
is an easy way to create simple formated content for blog posts or just 
pages in general. Note that the default format is just to leave the 
text of the chunk unprocessed which means normal html tags.

Chunk names that begin with an underscore are considered internal 
plated chunks ans some will be provided by the plated code for each 
page rendered. Here is a list of chunks that will be provided by the 
system.

	#^chunkname same=replace

This alters how we replace chunks when they are declared twice, 
normally the chunk in the lowest level will simply replace a chunk 
declared elsewhere. This is the default setting.

	#^chunkname same=append

If we change to append mode then chunks lower down will be appended to 
the higher up chunks. This is very useful for css chunks where we can 
append rules as we cascade down and these rules will take precedence 
over the earlier rules due to the magic of css.

	#^chunkname same=merge

This should only be used with a json chunk, it merges the data with its 
parent chunk so we can change or add values as we cascade down through 
the directories similar to append but working as objects rather than 
just plan text. This is why it should only be used with json chunks.

	#^_root

This will be set to a url that gets to the root of this website and 
should be used in front of all urls to make sure that we can find the 
files we want. This can be passed in on the command line and / is a 
good way to think of this value. The default is actually for plated to 
provide a relative url such as ../../ that would get you to the root of 
the site from the current page. You should be using _root as the prefix 
for all urls when including css or js or images etc in a html file.

	#^_site

Similar to root but intended to explicitly link to the root of the 
named site. This is intended for use in links that can never be 
relative to the current url so must be full and explicit urls, eg in 
RSS feeds.

	#^_sourcename

This will be set to the filename of the input source file that we are 
currently rendering.

	#^_filename

This will be set to url of the file that we are currently rendering.

	#^_dirname

This will be set to url of the directory containing the file that we 
are currently rendering.

	#^_flags

This is an object containing flag data for the defined chunks, most 
chunks will not have any flags defined but if they are they can be 
found in for example  _flags.chunkname.flagname which would hold the 
value of flagname for the given chunkname. This is really just for 
internal processing and should not need to be referenced by the user.

As well as the provided chunks there are some special names exist to 
trigger plugin behaviour and need to be defined with the correct 
configuration data, for instance

	#^_docs_json
	
Is the name of a chunk containing configuration data in json format 
that enables the docs plugin to create pages such as the ones that you 
are currently reading. See html.plated.plugins for documentation on how 
to use them and what data must be provided. All you need to know is 
that any chunk name that begins with an underscore belongs to the 
plated system itself and must only be created according to the 
documentation.

As well as chunknames there are two other things we can do with special 
characters at the start of a line.

	#^-this is a comment line

The comment line will simply be ignored, in case you wish to include 
some comments about what a chunk will be used for.

	#^=##

Allows the redefinition of the magic string, for the rest of the file, 
in this case, it would be ## instead of #^ but any string could be 
used. This is intended as an escape clause in case the magic string is 
undesirable in a certain file. It can also be changed on the command 
line when plated is invoked if you wish to change it globally.



## html.plated.files


A special string in the filename triggers chunk file processing, by 
default this is ^. but it can be changed to another character or string 
when plated is invoked. ^. seems to be a reasonably safe yet generally 
unused sequence of characters in file names.

Chunk files are text files containing chunks of text assigned to 
symbolic chunknames, these chunks can then be referenced by tags 
contained in other chunks and expanded to build final output files. 

This is intended to be simple macro expansion only rather than a 
complex programming language. Any programming would take place in a 
plugin, for instance we include a blog plugin that helps build blog 
style websites on top of this base chunk system.

There are two basic types of chunk files, directory scope and file 
scope. Directory scope chunk files contain chunks that can be 
referenced by any other chunk file in their directory as well as any 
sub directories. Directory scope chunks declared inside a sub directory 
will replace any chunks defined higher up the path, this allows us to 
adjust and group data using hierarchical directories.

	^.html
	^.css
	^.md
	^.what.ever.you.like

Are all examples of directory scoped chunk files, they do not create 
any output files themselves but are parsed to provide directory scope 
chunks which can be used in other chunk files. It does not matter what 
extension is used, primarily it is intended to be used as a clue to 
editors to provide appropriate language highlighting. By convention css 
chunks would be placed inside ^.css and html chunks inside ^.html but 
this is in no way enforced or necessary for plated to work.


	index.^.html
	layout.^.css
	hacks.^.js
	
Are all examples of file scoped chunk files. Each one will create a 
file in the output directory with the same path but the name altered 
slightly to remove ^. from it. For example index.^.html becomes 
index.html

The extension used selects the chunk name that will be rendered into 
the output file. So index.^.html will render the html chunk into the 
output file and layout.^.css will render the css chunk.

Usually pages in a directory will share the same layout, so a html 
chunk will be declared at the directory level with the file just adding 
a content chunk to be rendered inside this page structure. The 
cascading chunk system means you are free to alter this in sub 
directories but often pages have a lot in common so keeping a bunch of 
generic layout chunks in the root with sub directories just picking 
from them works perfectly. The idea is to provide data organisational 
tools but not to dictate the use.



## html.plated.macros


Once we have some chunks defined we need to provide a way of refering to them 
inside other chunks as a macro expansion.

	#^chunkname trim=ends
	I am expanded
	#^mainchunk
	Expand the {chunkname} to its contents.

If the above mainchunk was rendered then {chunkname} would be replace 
with the contents of the chunk that was defined as #^chunkname this 
macro expansion is recursive so you can include chunks within chunks 
within chunks. Combined with the cascading chunks this provides a huge 
amount of flexibility without any additional programming logic. Similar 
to {{moustache}} templates but with slightly less logic and a bit more 
recursion.

If {chunkname} does not exist then the text will be left untouched as 
{chunkname} also there must be no white space in this macro expansion. 
so { chunkname } will never expand to anything.

This may sound dangerous but we are able to get away with {} even 
inside C like languages that contain {} all over the place. If this 
scares you then you are free to redefine {} to {{}} when invoking 
plated but I assure you it is not necessary.

	{jsonchunk.member}

When using a json chunk a . can be used to pull out a value from the object

	{jsonarray.0.name}

If it is an array then the first item could be picked out with a number 
and then its member.

	{jsonarray.-1.name}

Negative numbers are allowed in which case it counts backwards from the 
end, in this case the last name of the last object in the array would 
be used.

Finally a json chunk may have another chunk applied as a layout.

	{jsonchunk:plate}
	
In this case plate is a chunk name that renders with {_it} being 
synonymous with {jsonchunk} This is similar to calling a macro with a 
number of values.

	{jsonarray:plate}

If a template is applied to an array then it is applied repeatedly to 
each item in that array. This allows for simple formatting of json data 
held within an array. The loop happens auto-magically with {_it} 
expanding to a different value each time.

All of these templating expansions are intended for use by plugins 
which provide arrays or objects of data for you to display.

If a plate is applied to empty data then the empty string is returned. 
Eg no expansion happens, this can help with layout logic removing some 
chunks and showing others depending on their existence.

Finally because we also need to be able to talk about these macros here 
without them accidently expanding then we have a simple way to escape 
them.

	{[}{chunkname}{]}

No matter how valid the chunkname is it will not expand because it is 
contained within the comment tags {[}{]} these tags will be removed 
after the text is rendered.

	{[[}{chunkname}{]]}

If multiple [ are used instead of one then it allows one level macro 
replacement per extra [ so we can control expansion this way. In the 
above example {chunkname} will expand once but any macros within that 
chunk will stay untouched. A tad complex but escape syntax is always a 
pain.

Due to the way this expands you must be careful to balance any use of 
{[}{]} within this chunk so as not to accidentally close the tag 
prematurely. This documentation for instance is designed to be used 
inside such a chunk so all square brackets inside {} have been 
carefully balanced to stop anything from going wrong.



## html.plated.operators


As well as chunknames we can also combine some logic operators to 
control how macros expand. This is mostly of use with json chunks where 
you wish to make a choice between a number of possibilities. For instance

	{obj.count==1&&obj:showit||obj:hideit}

The above is an example of a value?one:two style logic test. First 
obj.count is compared to the value 1 this will work if it is a string 
or a number due to the loose typing used. If true then obj will be 
rendered with the template chunk showit if false then instead obj will 
be rendered with the template chunk hideit. You can guess what these 
two templates are intended to do.

The operators are evaluated left to right with no precedence and are C 
like, hence == rather than just a single = sign. Here are all the 
possible operators that can be used.

	{a<b}
		returns true if a is less than b
	{a<=b}
		returns true if a is less than or equal to b
	{a>b}
		returns true if a is more than b
	{a>=b}
		returns true if a is more than or equal to b
	{a==b}
		returns true if a is equal to b
	{a&&b}
		a and b returns b if a is true else returns a
	{a||b}
		a or b returns b if a is false else returns a
	{a||}
		returns a if it exists else return an empty string

The last one is useful for making macros invisible if they refer to 
empty data. Normally macros remain in the output if they are invalid. 
So {a} on its own would either expand to something else or remain as 
{a} in the output. {a||} is just using the || operator to make it go 
away if empty.



## html.plated_plugin.blog


	#^_blog_json
	{
		posts_per_page:5,
		posts_per_feed:20,
		url:"http://base.site/url/",
		feed:{
			title:"Feed Title",
		}
	}

A chunk of this name must be created in a directory scope file for this 
plugin to parse it. posts_per_page is the number of posts per page, we 
will create as many pages as we need.

posts_per_feed specifys the number of posts to publish in the feed.json 
file. Which will be published using any data suplied in feed which can 
contain any valid jsonfeed values. The base url must also be suplied 
since feeds are expected to be copied to other domains. This url is 
intentionally seperate from _root as it must be explictly set and we 
can not get away with relative paths here.

Every directory within this blog directory will now be treated as a blogpost.

See source/blog for an example of this all fits together. Inside each 
of these directories we look for.

	#^_blog_post_json
	{
		"title":"my title",
		"author":"my name",
		tags:["tag1","tag2"],
		feed:{
			attachments:[{url:"http://domain.full/thing.mp3",mime_type:"mime/type"}],
		}
	}
	
Which contains metadata about the blog post, the feed object can 
contain any valid jsonfeed settings, by we try and set useful defaults 
from the rest of the metadata. All of these values can also be used in 
your templates to render the blog posts.

	#^_blog_post_body form=markdown
	This is my blog post body.

Our blog body is to be found in this chunk name, probably best to use 
markdown as it makes writing blog posts easier.

When it comes to generating the pages then the following chunks should 
be setup in base directory.

	#^_blog_page_body
	This is a page of blog posts, eg the front page.
	
Within this chunk we provide _blog_page_older as the url of an older 
page and _blog_page_newer as the url of a newer page. If there is no 
newer or older page then this will be empty. _list will contain an 
array of blog posts that we intend to display in this page. It will be 
at least one post and no more than the posts_per_page setting.

	#^_blog_post_body
	This is a single blog post, when viewed on its own page.

Within this chunk we provide _blog_post_older as the url of an older 
page and _blog_post_newer as the url of a newer page. If there is no 
newer or older page then this will be empty. _blog_post_body will 
contain the _blog_post_body as defined in the blog post directory.




## html.plated_plugin.copy


	#^_copy_json
	{
		include:[
			"",
		],
		exclude:[
			"fra",
			"spa",
		],
	}

A chunk of this name must be created in a directory scope file for this 
plugin to parse it. include is a list of prefixes to include and 
exclude is a list of prefixes within the include to exclude.

The above configuration is assumed to be within a file fra/^.index and 
spa/^.index so it would include all chunkfiles from root but exclude 
files in fra or spa, ie itself. This way we can have a default english 
site and a spanish translation under spa/ or french under fra/

The files are copied into the current directory without the prefix used 
in include.

An example can be found in test-source/006-copy



## html.plated_plugin.docs


	#^_docs_json
	{
		ignore:{
			"node_modules":true,
		},
		dirs:{
			"../js":".js",
		},
	}

A chunk of this name must be created in a directory scope file for this 
plugin to parse it. We should ignore any paths containing the key 
strings in the ignore object and will include (recursively) the keys in 
the dirs object but only if the filename ends in the given string.

So in the above case we will scan ../js for all .js files but ignore 
everything in node_modules. One should always ignore everything in 
node_modules.

These files are searched for special auto doc documentation syntax 
where any line that begins with --[#name.of.the.chunk will begin a 
special documentation chunk and ]] will end it. In both cases the 
string must be at the start of a line.

Each of these chunks will then be rendered into its own page as well as 
its parent pages, we use dot notation to describe this relationship. In 
the case of name.of.the.chunk it will exist in name.of.the name.of name 
and the always present /

Take a look at the source code that generates this site documentation 
in source/docs for an example of how this can be themed and presented.



## html.plated_plugin.import


	#^importedchunk import=dir/dir
	...
	
The content if this chunk is unimportant as it will be replaced by the 
chunk referenced from another file via the import=dir flag. 



## html.plated_plugin.redirect


	#^_redirect_json
	{
		files:{
			"from/index.html":"to/",
			"other/index.html":"to/",
		},
	}
	
A chunk of this name must be created in a directory scope file for this 
plugin to parse it. files is a map of redirections we require.

Perform a redirect of files, using simple html javascript redirection, 
to another url. We mostly make use of the automatic use of an 
index.html inside a given directory so in the case above ./from will 
get redirected to ./to note that these can contain one level of macro 
expansion so {_root}dir is a reasonable redirection.

Multiple redirections can be performed in a single json configuration 
but be aware that we end up actually creating files to perform these 
redirections so be careful not to clash with other files.

An example can be found in test-source/005-redirect



## js.plated


Plated is a static site generator that uses a cascading chunk system to 
describe the output pages.

Since we are using node we are also able to dynamically build the pages 
in the browser, which is why we include json dumps of the chunk data. 
This provides enough data to reconstruct pages client side.

Included are a handful of plugins that do slightly more complicated 
things to enable extra functionality such as page redirects or 
generating blogs.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated=require("./plated.js").create(opts,plated)

opts is an object of options and plated is an optional input if 
provided it will be modified and returned otherwise a new object will 
be created and returned.

We also load and setup this and all the builtin plugins so after 
calling this we are good to go.

In the future when we talk about plated and its available functions we 
are referring to the return from this create function.

The opts is intended to be filled with command line options so take a 
look at these for a full description of what can be passed in here.



## js.plated.blog


	plated.blog()

Create a starting blogpost with todays date in the main blog directory.

Title is taken from opts._[1] onwards IE the command line.



## js.plated.build


	plated.build()

Build all the output files from the inputs.



## js.plated.micro


	plated.micro()

Create a starting microblogpost with todays date-time in the main blog directory.

Markdown text is taken from opts._[1] onwards IE the command line.



## js.plated.plugin


	plated.plugin(it)

Register a plugin, each plugin can provide the following function hooks.

	dirs = it.process_dirs( dirs )

Adjust the registered dirs data and return it.

	file = it.process_file( file )

Adjust or react to the file data and return it.

	it.process_output( chunks )

Adjust a files chunks prior to writing it out, or, output extra data 
associated with these chunks.



## js.plated.setup


	plated.setup(opts)

Initialise plated and require the base plated modules: files, chunks 
and output.



## js.plated.watch


	plated.watch()

Continuously build the output files from the inputs whenever one of the input files changes



## js.plated_chunks


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



## js.plated_chunks.deepmerge


	too = plated_chunks.deepmerge(frm,too,_flags)

Merge the object, frm, into an object too. How values merge can be 
adjusted by _flags the same way _flags works in parsing chunks. 
same=merge is honoured here so some chunks can be appended rather than 
replace. We need to keep this separate as the act of merging will break 
how such things work.

This function is called recursively so as not to end up sharing values 
with any inputs.



## js.plated_chunks.delimiter_close_str


	s = plated_chunks.delimiter_close_str()

Return the last half of the opts.delimiter string.



## js.plated_chunks.delimiter_open_str


	s = plated_chunks.delimiter_open_str()

Return the first half of the opts.delimiter string.



## js.plated_chunks.delimiter_wrap_str


	s = plated_chunks.delimiter_wrap_str(s)

Return the given string wrapped in the opts.delimiter string.



## js.plated_chunks.expand_tag


	value = plated_chunks.expand_tag(v,dat,lastpass)

Do all the magical things that enables a tag to expand, normally we 
just lookup the value inside dat but a few operators can be applied.

if dat is null then we use data pushed into the namespaces otherwise we 
will only use data available in dat.

Operators are applied from left to right so we have no precedence 
besides this.

If we fail to lookup a valid value then we return input string wrapped 
in delimiters, essentially any values we do not understand will come 
out of the process unscathed  exactly as they went in.

There must be no white space inside {} or we will not process it.

This combined is why we can safely use {} rather than {{}} and any accidental 
use will survive.



## js.plated_chunks.fill_chunks


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



## js.plated_chunks.format_chunks


	chunks = plated_chunks.format_chunks(chunks)

Process the chunks according to their flags, a chunk with trim=ends set 
will have white space removed from its beginning and end.

A chunk with form=json will be parsed as json rather than a string. It 
can then be referenced inside chunks using chunk.member style lookups.

A chunk with form=markdown will be processed as markdown and turned 
into a html string.



## js.plated_chunks.lookup


	chunks = plated_chunks.lookup(str,dat)

lookup the string inside dat, the string can use dot notation such as 
parent.member to lookup a value inside an object.

Numbers can also be used to reverence arrays such as array.0 or array.1 
and negative indexes such as array.-1 can be used to fetch the last 
value from the array.



## js.plated_chunks.lookup_in_namespace


	chunks = plated_chunks.lookup_in_namespace(str)

lookup the string inside all namespaces using the same rules as 
plated_chunks.lookup



## js.plated_chunks.markdown


	html = plated_chunks.markdown(str)

Convert a markdown string to a html string. As a personal quirk We keep 
newlines a little more eagerly than standard markdown allowing some 
control over the spacing between your text.

Markdown is hardly a standard thing, after all.



## js.plated_chunks.merge_namespace


	chunks = plated_chunks.merge_namespace(dat)

Merge all of the namespaces together, along with the dat, then return 
this new set of chunks for easy lookup it should be safe to modify the 
output merged chunks without accidentally changing anything in the 
namespace.

This gives us a final chunks object that we can use to build the output 
page.



## js.plated_chunks.pop_namespace


	plated_chunks.pop_namespace(value)

Remove last namespace from top of the stack.



## js.plated_chunks.prepare


	array = plated_chunks.prepare(chunks)

break a string on {data} ready to find the lookup values and do all the 
templating actions. This just gets us an array of string parts we can 
easily parse.
 



## js.plated_chunks.push_namespace


	plated_chunks.push_namespace(value)

Add this value into the namespaces, we check this namespace as well as 
the current chunk data when filling in chunks.



## js.plated_chunks.remove_underscorechunks


	newchunks = plated_chunks.remove_underscorechunks(chunks)

Remove any chunks that begin with "_" these are all internal chunks 
used by plated code. The user should not be creating any chunks whose 
names begin with an underscore. Also none of these chunks should ever 
bubble down through the heirachy, they belong only to the page in 
which they are created..

A new object full of only chunks that do not begin with an underscore 
is returned.



## js.plated_chunks.replace


	value = plated_chunks.replace(str,dat)

Repeatedly call replace_once until all things that can expand, have 
expanded, or we ran out of sanity. Sanity is 100 levels of recursion, 
just to be on the safe side.

We then call a final replace_once with the lastpass flag set.

if dat is null then we use data pushed into the namespaces otherwise we 
will only use data available in dat.



## js.plated_chunks.replace_once


	chunks = plated_chunks.replace_once(str,dat,lastpass)

Parse the str and replace {} values once only using dat values. 
lastpass is a flag as on the lastpass we allow final expansion and removal.

We can use {[} {]} around areas of text to prevent further expansion 
inside. So we can talk about plated inside plated, this is necesary for 
our documentation.



## js.plated_chunks.reset_namespace


	plated_chunks.reset_namespace()

clear the namespace, a namespace is a list of chunks that will be 
merged together as we descend into directories. The lower or later 
chunks replacing or merging with the previous ones.



## js.plated_chunks.set_namespace


	plated_chunks.set_namespace(values)

Set the namespace to the given value.



## js.plated_files


Manage the files that we read from and watch or write to.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_files = require("./plated_files.js").create(opts,plated)

This is called automatically when the plated module is created and the 
return value is made available in plated.chunks note that all of these 
modules are bound together and operate as a group with shared data.

In the future when we talk about this module and its available 
functions we are referring to the return value from this create 
function.



## js.plated_files.base_files_to_chunks


	chunks = await plated_files.base_files_to_chunks(fname)
 
Check this directory and all directories above for generic chunks build 
all of these into the current chunk namespace for this file.



## js.plated_files.build


	plated_files.build()
 
Build all files found in the source dir into the output dir.



## js.plated_files.build_file


	plated_files.build_file(fname)
 
Build the given source filename, using chunks or maybe just a raw copy 
from source into the output.



## js.plated_files.empty_cache


	plated_files.empty_cache()
 
Empty the current file cache, we fill it up as read files.



## js.plated_files.empty_folder


	plated_files.empty_folder(path)
 
Empty the (output) folder or make it if it does not exist. This is 
rather dangerous so please be careful.



## js.plated_files.exists


	await plated_files.exists(path)

Returns true if a file or dir at the given path exists.



## js.plated_files.file_to_chunks


	chunks = plated_files.file_to_chunks(root,fname,chunks)
 
Load root/fname or get it from the cache and then turn it into chunks 
using plated_chunks.fill_chunks(date,chunks) chunks is returned.



## js.plated_files.filename_fixup


	filename = plated_files.filename_fixup(filename)

Fix the filename, so it becomes an empty string rather than a "." or 
"/." or "/" this makes it easier to use in urls.



## js.plated_files.filename_is_basechunk


	bool = plated_files.filename_is_basechunk(filename)

Is this filename part of the basechunks for a dir?

A base chunk is something like ^.html or ^.css all of these files get 
merged into the base chunks for the directory they are found in. Their 
extension is ignored and just to help syntax highlighting when the file 
is viewed.



## js.plated_files.filename_is_plated


	bool = plated_files.filename_is_plated(filename)
 
Is this filename something we need to run through plated. Returns true 
if filename contains the ^ trigger string. This string can be changed 
by altering opts.hashfile from "^" to something else.



## js.plated_files.filename_to_dirname


	dirname = plated_files.filename_to_dirname(filename)

Get the dirname of this filename.



## js.plated_files.filename_to_output


	filename = plated_files.filename_to_output(filename)
 
Work out the output filename from an input filename, the trigger string 
"^." gets removed as we process a file.



## js.plated_files.find_dirs


	plated_files.find_dirs(root,name,func)
 
Call func(name) with every directory we find inside the root/name 
directory. We follow symlinks into other directories.



## js.plated_files.find_files


	plated_files.find_files(root,name)
 
REturn an array with every file we find inside the root/name directory. 
We follow symlinks into other directories.



## js.plated_files.joinpath


	await plated_files.joinpath(...)

join components into a full path.



## js.plated_files.lstat


	await plated_files.lstat(path)

Return the lstat of this path



## js.plated_files.mkdir


	plated_files.mkdir(dir)

Create the given dir and recursively create its parent dirs as well if 
necessary.



## js.plated_files.prepare_namespace


	plated_files.prepare_namespace(fname)
 
Check this directory and all directories above for generic chunks then 
build all of these into the current chunk namespace for this file.



## js.plated_files.readdir


	await plated_files.readdir(path)

Return the readdir of this path



## js.plated_files.set_source


	plated_files.set_source(dir)

Fill in _source and related chunks such as.

_sourcename the file that this set of chunks came from.

_filename the output filename.

_dirname the output dirname.

_root the root of the site, normally a relative path to the current 
directory, eg ../ since some things such as github pages need to exist 
in a directory rather than the root of a site. This should always be 
used in html paths, {_root} instead of / to make sure that you always 
get to the right place and can find your files.

_filename the url path of the filename, eg /dirname/filename

_dirname the url path of the dir this file exists in, eg /dirname



## js.plated_files.source_to_output


	filename = plated_files.source_to_output(filename)

Convert a source path into an output path.



## js.plated_files.stat


	await plated_files.stat(path)

Return the stat of this path



## js.plated_files.trimpath


	plated_files.trimpath(path)

Remove a trailing / from the path



## js.plated_files.watch


	plated_files.watch()
 
Build all files found in the source dir into the output dir and then 
sit watching for changes to these files that would trigger rebuilds.

This does not return, instead the user is expected to ctrl+c when 
finished.




## js.plated_files.write


	plated_files.write(filename,data)

Create parent dir if necessary and write the data into this file.



## js.plated_output


Manage the chunks of text that are combined into a page.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_output = require("./plated_output.js").create(opts,plated)

This is called automatically when the plated module is created and the 
return value is made available in plated.chunks note that all of these 
modules are bound together and operate as a group with shared data.

In the future when we talk about this module and its available 
functions we are referring to the return value from this create 
function.



## js.plated_output.remember


	chunks = plated_output.remember(chunks)

Remember this page, the name is expected to be found in 
chunks._output_filename and this is used as the key to store these 
chunks.



## js.plated_output.remember_and_write


	chunks = await plated_output.remember_and_write(chunks)

The same as remember but also instantly write out the chunks using 
plated_output.write



## js.plated_output.write


	await plated_output.write(chunks)

Write out the chunks to to _output_filename as its final page like 
form. chunks._output_chunkname is the name of the chunk that we intend 
to render into this page, eg "html" 

opts.output is the directory we are going to write the file into.

If the opts.dumpjson flag is set then we also output a 
.json file which contains the chunks used to construct this page.



## js.plated_output.write_all


	plated_output.write_all()

Go through all the remembered chunks and write each one out using 
plated_output.write



## js.plated_output.write_map


	plated_output.write_map()

Output plated.map.json which is a concise map of all chunks for all 
files and directories.



## js.plated_plugin.blog


A blog plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_blog = require("./plated_plugin_blog.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.



## js.plated_plugin.blog.process_dirs


	dirs = plated_plugin_blog.process_dirs(dirs)

Tweak all the base chunks grouped by dir name and pre cascaded/merged



## js.plated_plugin.blog.process_file


	chunks = plated_plugin_blog.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be available.



## js.plated_plugin.copy


A blog plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_copy = require("./plated_plugin_copy.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.

This plugin is intended to duplicate part of a site into another 
directory with possibly tweaked chunks, this is primarily intended for 
text translations. We produce for instance pure text chunks containing 
just english text and replace these chunks with french versions inside 
a fra directory.

Note that we only copy chunkfiles not all data files, so this is 
only about duplicating files that are rendered from chunks.



## js.plated_plugin.copy.process_dirs


	dirs = plated_plugin_copy.process_dirs(dirs)

Remember all the _copy_json chunks we can find inside our 
plated_plugin_copy.chunks array. This will be used later to 
replicated output into other locations with slight chunk tweaks.



## js.plated_plugin.copy.process_file


	chunks = plated_plugin_copy.process_file(chunks)

Auto magically parse _copy_json chunks as json.



## js.plated_plugin.copy.process_output


	plated_plugin_copy.process_output(chunks)

Compare this output file with cached copy chunks and duplicate it 
into these directories with slightly tweaked chunks if it matches.



## js.plated_plugin.docs


A docs plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_docs = require("./plated_plugin_docs.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.



## js.plated_plugin.docs.process_dirs


	dirs = plated_plugin_docs.process_dirs(dirs)

Tweak all the base chunks grouped by dir name and pre cascaded/merged



## js.plated_plugin.docs.process_file


	chunks = plated_plugin_docs.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be available.



## js.plated_plugin.import


A way of importing chunks from another page.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_import = require("./plated_plugin_import.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.



## js.plated_plugin.import.process_file


	chunks = plated_plugin_import.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be 
available.



## js.plated_plugin.redirect


A blog plugin.

This module only exposes one function, which is used to create 
the actual module with bound state data.

	plated_plugin_redirect = require("./plated_plugin_redirect.js").create(opts,plated)

This is called automatically when the plated module is created and the 
returned plugin functions are added to the plugin call stack. Note that 
all of these modules are bound together and operate as a group with 
shared data.



## js.plated_plugin.redirect.process_dirs


	dirs = plated_plugin_redirect.process_dirs(dirs)

Tweak all the base chunks grouped by dir name and pre cascaded/merged



## js.plated_plugin.redirect.process_file


	chunks = plated_plugin_redirect.process_file(chunks)

Tweak a single file of chunks, only chunks found in this file will be 
available.

	#^_redirect_json

Is a special chunk name that we will parse as json and contain 
configuration data to setup redirects.
