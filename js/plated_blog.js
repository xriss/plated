
var fs = require('fs');
var util=require('util');
var path=require('path');
var watch=require('watch');


var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

// wrap so we can contain multiple environments without borking
exports.create=function(opts,plated){

	var plated_blog={};
	
	
// tweak all the base chunks grouped by dir name and pre cascaded/merged
	plated_blog.process_dirs=function(dirs){
		
		
		
		
		return dirs;
	};


// tweak a single file of chunks, all parent base chunks will have been cascaded/merged into this set of chunks and default formatting already applied
	plated_blog.process_file=function(chunks){
		
		
		
		
		return chunks;
	};


	return plated_blog;
};
