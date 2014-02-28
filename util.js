var rdfstore = require('rdfstore')
	, server = require('./node_modules/rdfstore/server').Server
	, fs = require('fs');


module.exports = {

sortData: function(results,globalData,parsedJSON, sortCriteria,object){
		
		globalData[object]= new Array();
		var sortCriteriaArray = new Array();
		var arr = new Array();
		 for (var i = 0; i < results.length; i++) {
			 var uri = results[i].value;
			 var date = parsedJSON[uri][sortCriteria];
			 if(date){
				 var dateValue = parsedJSON[uri][sortCriteria][0].value;
				 var r = i * 2  ;
				 arr[r] = dateValue;
				 r = r + 1;
				 arr[r] = uri;
				 sortCriteriaArray.push(dateValue);
			 }
		 }
		 sortCriteriaArray.sort();
		 for (var i = 0; i < sortCriteriaArray.length; i++) {
			 var index = arr.indexOf(sortCriteriaArray[i]);
			 var j = index + 1;
			 globalData[object].push(arr[j]); 
			 arr.splice(index,2);
		 }
	}
};
