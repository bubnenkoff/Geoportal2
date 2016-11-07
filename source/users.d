module users;

struct User 
{
	int id;
	string login;
	string password;
	string usergroup;
	string organization;
	string email;

}

struct AuthInfo
{
    User user; //User structure

    bool isAuthorized;
    bool isAdmin;
    bool passwordOK; //set to true if password from login == password from DB

}

struct userCredentials // info from DB
{
    bool isExists; // to set up flag if user exists in DB
    bool isAdmin;
    bool passwordOK; //set to true if password from login == password from DB
}


