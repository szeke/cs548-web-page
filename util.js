var rdfstore = require('rdfstore')
	, server = require('./node_modules/rdfstore/server').Server
	, fs = require('fs');

module.exports = {
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
				console.log("Loaded " + d + " triples.");
				filesLoaded += 1;
				if (filesLoaded == fileArray.length) {
					f(store);
				}
			});
		}
	} ,

	exectueQueries: function(queries, pageData, store, f) {
		var queriesExecuted = 0;

		for (var i = 0; i < queries.length; i++) {
			console.log("execute\n" + queries[i].query);
	  	store.execute(queries[i].query, function(success, results) {
      	//console.log(results);
      	queriesExecuted += 1;
      	queries[i].callback(results, pageData, store);
      	if (queriesExecuted == queries.length) {
					f(pageData);
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
	      console.log(doc);
	      object[uri] = doc[0];
	      object['uris'].push(uri);
	    });
	  }
	}
};

