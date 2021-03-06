function sendLoginInfo()
  {
      var loginData = 
      {
      	login : this.login,
      	password : this.password,
      	language : "",
      	country : ""
      }

      console.log("site loginData: ", loginData); 

      this.$http.post('/api/login', loginData).then(function (response) {
        console.log("server response: ", response.data)

        if(response.data["status"] == "success") // process only if we got status=success
        {
	        //Admin
	        if(response.data.login.isAuthorized == true && response.data.login.isAdmin == true)
	        {
	          console.log("We are Authorized: isAuthorized == true");
	          App.topMenuView = 'adminmenu'; //Change current view!
	          App.contentView = 'admincontent';
	         // userLoginNotification("Welcome, " + loginData["login"], "Login success"); // notificate admin
	          App.login = loginData["login"];
	        }
	        //User
	        else if(response.data.login.isAuthorized == true && response.data.login.isAdmin == false)
	        {
	          console.log("User is Authorized: isAuthorized == true");
	          App.topMenuView = 'usermenu'; //Change current view!
	          App.contentView = 'usercontent';
	        //  userLoginNotification("Welcome, " + loginData["login"], "Login success"); // notificate user
	          App.login = loginData["login"];
	        }
	     }

	    if(response.data.status == "fail")
        {
          if (response.data.login.username == "userDoNotExists")
          {
          	console.log("User: " + loginData["login"] + " do not exists");
          	userLoginNotification(`User "` + loginData["login"] + `" do not exists `, `Login failed`);	
          }

          else if (response.data.login.password == "wrongPassword")
          {
          	console.log("Wrong password for user: " + loginData["login"]);
          	userLoginNotification("Wrong password for user: " + loginData["login"], "Login failed");	
          }

          else if (response.data.login.password == "ServerSideDBError") //Not Implemented on Server Side
          {
          	console.log("Server could not get information from DB. Check server logs");
          	userLoginNotification("Server could not get information from DB. Check server logs");
          }

        } 


	    },

	      function(response)
	      {
	        console.log("Server error: ", response.status) // from server, not JSON code
	      }
	 );
		

  }


function checkAuth()
{
	// we should NOT send any data like: loginData because after refreshing page
	// all filds are empty and we need to ask server if he have authorize session

  console.log("Checking if user already have active session"); 

	this.$http.post('/api/auth').then(function (response) {
	     console.log("server response: ", response.data)

	     if(response.data["status"] == "success") // process only if we got status=success
	     {

	        //Admin
	        if(response.data.login.isAuthorized == true && response.data.login.isAdmin == true)
	        {
	          console.log("We are already authorized on site as admin (F5 even accure)");
	          App.topMenuView = 'adminmenu' //Change current view!
	          App.contentView = 'admincontent';
	          App.login = response.data.login.login;
	        }
	        //User
	        else if(response.data.login.isAuthorized == true && response.data.login.isAdmin == false)
	        {
	          console.log("We are already authorized on site as user (F5 even accure)");
	          App.topMenuView = 'usermenu' //Change current view!
	          App.contentView = 'usercontent';
	          App.login = response.data.login.login; // get user name from response and set it to {{login}}

	        }
	     }

	   if(response.data.login.isAuthorized == false)
	   {
	     console.log("User do not Authorizated!");
	   } 

	    },

	      function(response)
	      {
	        console.log("Error on server code: ", response.status) // from server, not JSON code
	      }
	 );

}


  function logout()
  {
  	  var loginData = new Object();
      //data that we take from user input
      loginData["login"] = App.login; // username more then enough
	  console.log("Logout username -> " + App.login);
	  console.log(loginData);
	  console.log("-------------------------");

	this.$http.post('/api/logout', loginData).then(function (response) {
	    console.log("server response: ", response.data)
	    if(response.data["isAuthorized"] == false)
	    {
	      console.log("Logout from site success");
	      App.topMenuView = 'guestmenu' //Change current view!
	      App.contentView = 'guestcontent';
	      userLoginNotification("Goodbye, " + App.login, "User Logout"); // notificate user
	    }
	});

  }