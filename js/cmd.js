
var cmd=exports;

var fs = require('fs');
var util=require('util');
var path=require('path');

var plated=require("plated.js");

var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

cmd.run=function(argv)
{
	if( argv._[0]=="build" )
	{
		return plated.build();
	}

	// help text
	console.log(
		"\n"+
		"> plated build \n"+
		"Build all output into static.\n"+
		"Use --source=/dirname/ to choose the source folder.\n"+
		"Use --output=/dirname/ to choose the output folder.\n"+
		"\n"+
		"\n"+
	"");
}

cmd.build=function()
{
}

// if global.argv is set then we are inside another command so do nothing
if(!global.argv)
{
	var argv = require('yargs').argv; global.argv=argv;
	cmd.run(argv);
}

