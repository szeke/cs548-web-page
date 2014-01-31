var rdfstore = require('rdfstore')
  , server = require('./node_modules/rdfstore/server').Server
  , fs = require('fs')
  , express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , util = require('./util')
  , dateFormat = require("date-format-lite")
  , jsonld = require('jsonld');
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

// The top level object
//
var topLevelUri = 'http://lod.isi.edu/course/cs548/2014/spring'

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
    query: "SELECT ?uri ?date { ?uri a syll:Lecture ; syll:hasEventDate ?date . } ORDER BY ?date DESC(?date)" ,
    callback: function (results, globalData, store) {
      globalData.lectures = new Object();
      util.uriToJSONLD(results, globalData.lectures, store);
    }
  } ,
  { 
    query: "SELECT ?uri ?date { ?uri a syll:Homework ; syll:hasEventDate ?date . } ORDER BY ?date DESC(?date)" ,
    callback: function (results, globalData, store) {
      globalData.homeworks = new Object();
      util.uriToJSONLD(results, globalData.homeworks, store);
    }
  } ,
  { 
    query: "SELECT ?uri ?date { ?uri a syll:ProjectEvent ; syll:hasEventDate ?date . } ORDER BY ?date DESC(?date)" ,
    callback: function (results, globalData, store) {
      globalData.projects = new Object();
      util.uriToJSONLD(results, globalData.projects, store);
    }
  } ,
  {
    query: "SELECT ?uri { ?uri a syll:Person . }" ,
    callback: function (results, globalData, store) {
      globalData.people = new Object();
      util.uriToJSONLD(results, globalData.people, store);
    }
  } ,
  {
    query: "SELECT ?uri { <"+topLevelUri+"> syll:hasInstructor ?uri . ?uri foaf:lastName ?lastName . } ORDER BY ?lastName ASC(?lastName)" ,
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

// This is the callback function after we load all the RDF files.
// It executes the queries to build the JSON data for the web site,
// and then renders the data using jade.
//
function createJsonAndStartApp(store) {
  var pageData = { store: store };

  store.node(topLevelUri, function(success, graph) {
    var doc = server.graphToJSONLD(graph, store.rdf);
    console.log(doc);
    pageData['topLevel'] = doc[0];

    util.exectueQueries(queries, pageData, store, function(data) {
      console.log(pageData);
      app.get('/', function(req, res) {
        res.render('index', data)
      });
      app.listen(3000);
    });
  });
}

// Main program: create the store and get things going.
//
rdfstore.create(function(store) {
  store.registerDefaultProfileNamespaces();
  store.registerDefaultNamespace('syll', 'http://lod.isi.edu/ontology/syllabus/');
  store.registerDefaultNamespace('lecture', 'http://lod.isi.edu/cs548/lecture/')
  util.loadRdfFiles(store, rdfFiles, createJsonAndStartApp);
}) 


