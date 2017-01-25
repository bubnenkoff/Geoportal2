function getImagesTypes()
{
	// we should NOT send any data like: loginData because after refreshing page
	// all filds are empty and we need to ask server if he have authorize session

  console.log("Getting Apparature Types for generation menu"); 

    var RequestBody = {
      "request_type": "apparature_types"
    };

	this.$http.post('/dbdata', RequestBody).then(function (response) {
	     console.log("(apparature_types) server response: ", response.data)

	     // App.$refs.userContent.images_types.push(response.data);

	     for(x of response.data)
	     {
	     	App.$refs.userContent.apparature_types.push(x);
	     }

	    },

	      function(response)
	      {
	        console.log("Error on server code: ", response.status) // from server, not JSON code
	      }
	 );

}