var rdfstore = require('rdfstore')
  , server = require('./node_modules/rdfstore/server').Server
  , fs = require('fs')
  , express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , util = require('./util')
  , dateFormat = require("date-format-lite")
  , jsonld = require('jsonld')
  , sparqlClient =  require('sparql-client')
  , async = require('async')
;


// Set up Express stuff.
//
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

//register for GET request
app.get('/', serveRequest);

// The top level object
//
var topLevelUri = 'http://lod.isi.edu/course/cs548/2014/spring'

var syllPrefix = 'PREFIX syll: <http://lod.isi.edu/ontology/syllabus/>';	

var foafPrefix = 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>';
	
// The files containing the RDF for our web site.
//
var rdfFiles = [ 'data/events.n3', 'data/people.n3', 'data/schedule.n3' ];

// Once we load the RDF into our triple store, we will run the following queries to build
// the JSON data that defines the page. The queries get the URIs that define the main 
// content areas, and then we fetch all the properties of each URI as a JSON-LD object, 
// which is much nicer to deal with than SPARQL result sets.
//
var queries = [
               { 
                 query: syllPrefix+" SELECT ?uri ?date { ?uri a syll:Lecture ; syll:hasEventDate ?date . } ORDER BY ?date DESC(?date)" ,
                 callback: function (results, globalData, store) {
                   globalData.lectures = new Object();
                   util.uriToJSONLD(results, globalData.lectures, store);
                 }
               } ,
               { 
                 query: syllPrefix+" SELECT ?uri ?date { ?uri a syll:Homework ; syll:hasEventDate ?date . } ORDER BY ?date DESC(?date)" ,
                 callback: function (results, globalData, store) {
                   globalData.homeworks = new Object();
                   util.uriToJSONLD(results, globalData.homeworks, store);
                 }
               } ,
               { 
                 query: syllPrefix+" SELECT ?uri ?date { ?uri a syll:ProjectEvent ; syll:hasEventDate ?date . } ORDER BY ?date DESC(?date)" ,
                 callback: function (results, globalData, store) {
                   globalData.projects = new Object();
                   util.uriToJSONLD(results, globalData.projects, store);
                 }
               } ,
               {
                 query: syllPrefix+" SELECT ?uri { ?uri a syll:Person . }" ,
                 callback: function (results, globalData, store) {
                   globalData.people = new Object();
                   util.uriToJSONLD(results, globalData.people, store);
                 }
               } ,
               {
                 query: syllPrefix+" "+foafPrefix+" SELECT ?uri { <"+topLevelUri+"> syll:hasInstructor ?uri . ?uri foaf:lastName ?lastName . } ORDER BY ?lastName ASC(?lastName)" ,
                 callback: function (results, globalData, store) {
                   globalData.instructors = new Array();
                   for (var i = 0; i < results.length; i++) {
                     globalData.instructors.push(results[i].uri.value);
                   };
                 }
               } , 
               {
                 query: "SELECT ?uri { <"+topLevelUri+"> <http://vivoweb.org/ontology/core#hasPrerequisite> ?uri . }" ,
                 callback: function (results, globalData, store) {
                   globalData.prerequisites = new Object();
                   util.uriToJSONLD(results, globalData.prerequisites, store);
                 }
               }
];


//Set up sparql-client stuff
var endpoint = 'http://localhost:8080/openrdf-sesame/repositories/cs548';
var client = new sparqlClient(endpoint);

// This is the callback function after we load all the RDF files.
// It builds the JSON data for the web site
function createJsonAndStartApp(store) {
	var pageData = { store: store };
	store.node(topLevelUri, function(success, graph) {
    var doc = server.graphToJSONLD(graph, store.rdf);
    pageData['topLevel'] = doc[0];
    console.log(pageData);
    util.setGlobalData(pageData);
	util.setStore(store);
	app.listen(3000);
	console.log("Listening on port 3000");   
   
 });
}
	
//Main program: create the store and get things going.
//
rdfstore.create(function(store) {
  store.registerDefaultProfileNamespaces();
  store.registerDefaultNamespace('syll', 'http://lod.isi.edu/ontology/syllabus/');
  store.registerDefaultNamespace('lecture', 'http://lod.isi.edu/cs548/lecture/')
  util.loadRdfFiles(store, rdfFiles, createJsonAndStartApp);
}) ;


//It serves the request for the index page.
function serveRequest(req,res){
	var pagedata = util.getGlobalData();
	var store = util.getStore();
	async.forEachSeries(queries,function(item,callback_1) {
		var obj;
		client.query(item.query).execute(function(error, results) {
			if(results != null) {
				obj = JSON.parse(JSON.stringify(results));
				item.callback(obj.results.bindings,pagedata, store);
				callback_1(); // Tell async that the current iterator task is finished.
			}
			else if(error != null) {
    			console.log(error);
    		}
		});
	}, function(){ // Called after all the iterator functions have finished
		//console.log(pagedata);
		res.render("index",pagedata);
	});
}