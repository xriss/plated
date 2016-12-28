#!/usr/bin/env node

var cmd=exports;

var util=require('util');

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }


var argv = require('yargs').argv; global.argv=argv;


argv.source   = argv.source   || "source";
argv.output   = argv.output   || "output";
argv.plated   = argv.plated   || "^";
argv.hashchar = argv.hashchar || "^";


if( argv._[0]=="build" )
{
	var plated=require("./plated.js").create(argv);
	return plated.build();
}
else
if( argv._[0]=="watch" )
{
	var plated=require("./plated.js").create(argv);
	return plated.watch();
}

// help text
console.log(
	"\n"+
	"> plated build \n"+
	"\tBuild all files in source folder into output folder.\n"+
	"\t\t--source=source -- choose the source folder.\n"+
	"\t\t--output=output -- choose the output folder.\n"+
	"\t\t--plated=^      -- choose the trigger string used in filenames.\n"+
	"\t\t--hashchar=^    -- choose the trigger character used in chunk files.\n"+
	"\n"+
	"> plated watch \n"+
	"\tBuild and then watch all files in source folder, rebuilding if they change.\n"+
	"\n"+
"");
