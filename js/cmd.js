
var cmd=exports;

var util=require('util');

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }


var argv = require('yargs').argv; global.argv=argv;


argv.source = argv.source || "source";
argv.output = argv.output || "output";


if( argv._[0]=="build" )
{
	var plated=require("./plated.js").create({
		source: argv.source,
		output: argv.output,
	});
	return plated.build();
}


// help text
console.log(
	"\n"+
	"> plated build \n"+
	"\tBuild all files in source folder into output folder.\n"+
	"\t\t--source=/dirname/ to choose the source folder.\n"+
	"\t\t--output=/dirname/ to choose the output folder.\n"+
	"\n"+
	"\n"+
"");
