module.exports = {

sortData: function(results,globalData,parsedJSON, sortCriteria,object){
		
		var sortedArray = new Array();
		globalData[object]= new Array();
		var counter = 0;
		for (var i = 0; i < results.length; i++) {
			 var uri = results[i].value;
			 var date = parsedJSON[uri][sortCriteria];
			 if(date){
				 sortedArray[counter] = new Object();
				 sortedArray[counter].uri = uri;
				 sortedArray[counter].date = date[0].value;
				 counter++;
			 }	 
		 }
		 
		sortedArray.sort(function(a,b){
			 var dateA=new Date(a.date), dateB=new Date(b.date)
			 return dateA - dateB; //ascending
		 });

		 for (var i = 0; i < sortedArray.length; i++) {
				globalData[object].push(sortedArray[i].uri);
		}
	}


};
