var rdfstore = require('rdfstore')
	, server = require('./node_modules/rdfstore/server').Server
	, fs = require('fs');

var dataForTemplate;
var globalStore;

module.exports = {
		
getStore: function() {
	return globalStore;
},
		
getGlobalData: function() {
	return dataForTemplate;	
},	

setGlobalData: function(data) {
	dataForTemplate = data;
},

setStore: function(store){
	globalStore = store;
},	

	/**
	 * Load several RDF files in turtle format and call f when they are all loaded.
	 * @param {store} the rdfstore where we will load the triples.
	 * @param {fileArray} an array of file names to load.
	 * @return {f} callback function to call when all files are loaded f(store).
	 */
	loadRdfFiles: function(store, fileArray, f) {
		var filesLoaded = 0;

		for (var i = 0; i < fileArray.length; i++) {
			var fileName = fileArray[i];
			var rdf = fs.readFileSync(fileName).toString();
			store.load('text/turtle', rdf, function(s, d) {
				//console.log("Loaded " + d + " triples.");
				filesLoaded += 1;
				if (filesLoaded == fileArray.length) {
					f(store);
				}
			});
		}
	} ,
    
  uriToJSONLD: function (results, object, store) {
	  object['uris'] = new Array();
	  for(var i = 0; i < results.length; i++) {
	    var uri = results[i].uri.value;
	    store.node(uri, function(success, graph) {
	      var doc = server.graphToJSONLD(graph, store.rdf);
	    // console.log(doc);
	      object[uri] = doc[0];
	      object['uris'].push(uri);
	    });
	  }
	} 		
};
