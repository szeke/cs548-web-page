var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , util = require('./util')
  , dateFormat = require("date-format-lite")
  , async = require('async')
  , http = require('http')
;

//Set up Express stuff.
var app = express();

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
))
app.use(express.static(__dirname + '/public'))

var courseUri = 'http://isi.edu/cs548/2014/fall';

var endpoint = '/openrdf-sesame/repositories/cs548?query=';
var query = "CONSTRUCT { ?s ?p ?o } where { ?s ?p ?o }";


var uris = [
           {
            	uriString: 'http://lod.isi.edu/ontology/syllabus/hasInstructor',
            	createObject: function(results, globalData) {
            		globalData.instructors = results;
            	}
            },
            {
            	uriString: 'http://vivoweb.org/ontology/core#hasPrerequisite',
            	createObject: function(results, globalData) {
            		globalData.prerequisites = results;
            	}
            	
            },
            {
            	uriString: 'http://lod.isi.edu/ontology/syllabus/hasProjectEvent',
            	createObject: function(results, globalData,parsedJSON) {
            		util.sortData(results,globalData,parsedJSON,'http://lod.isi.edu/ontology/syllabus/hasEventDate','projectevents');
            	}
            },
            {
            	uriString: 'http://lod.isi.edu/ontology/syllabus/hasHomework',
            	createObject: function(results, globalData,parsedJSON) {
            		util.sortData(results,globalData,parsedJSON,'http://lod.isi.edu/ontology/syllabus/hasEventDate','homeworks');
            	}
            	
            } , 
          
            {
            	uriString: 'http://lod.isi.edu/ontology/syllabus/hasLecture',
            	createObject: function(results, globalData,parsedJSON) {
            		util.sortData(results,globalData,parsedJSON,'http://lod.isi.edu/ontology/syllabus/hasEventDate','lectures');
            	}
            }
];

//register for GET request
app.get('/', serveRequest);
app.listen(3000);
console.log("Listening on port 3000");

//It serves the request for the index page.
function serveRequest(req,resp){
	var pagedata = new Object();
	var data = '';
	async.series([
	              function(callback){
	              //1. Get all the triples from the endpoint
	          		var encodedquerystring = encodeURIComponent(query);
	          		var options = {
	        		    host: 'localhost',
	        		    port: 8080,
	        		    path: endpoint +encodedquerystring,
	        	        headers: {
	        	            'Content-Type': 'application/x-www-form-urlencoded',
	        	            'Accept': 'application/rdf+json',
	        	        }
	        		  };
	    		
	          		var req = http.get(options, function(res) {
	        	    res.on('data', function (chunk) {
	        	      data += chunk;
	        	    });
	        	    res.on('end', function () {
	        	    	//console.log(data);
	        	    	callback(); //the current task is finished, go onto the next task.
	        	    });
	        	  }).on('error', function(e) {
	        	    console.log("Got error: " + e.message);
	        	  });
	              },
	              
	              function(callback) {
	              //2. Construct data to be rendered by jade
	            	  var parsedJSON = JSON.parse(data);
	            	  pagedata.course = parsedJSON[courseUri];
	            	  pagedata.alltriples = parsedJSON;
	            	  uris.forEach(function(entry){
                  		var results = pagedata.course[entry.uriString];
                  		console.log(results);
                  		entry.createObject(results,pagedata,parsedJSON);
                  	});
	            	  callback();
	              }
	              
	], function(){
		//3. render the page.
		resp.render("index",pagedata);
	});
}