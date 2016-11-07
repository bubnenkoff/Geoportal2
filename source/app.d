import vibe.d;
import std.stdio;
import std.conv;
import std.algorithm;
import std.datetime;
import std.path;
import std.uni : toLower;
import std.file;
import std.experimental.logger;

import draft.database;
import parseconfig;
import dbconnect;

import gdalprocessing;

import globals;

pragma(lib, "ssl");
pragma(lib, "crypto");

import users;

//--------------------------------------------------------//

string roothtml;

static this()
{
    
    roothtml = buildPath(getcwd, "html") ~ "\\";
    if(!roothtml.exists)
       writeln("[ERROR] HTML dir do not exists");     

}

Config config;

string dbname = "system.db"; // default database name


void main()
{
    config = new Config();

    dbSetup(); // first run

    auto router = new URLRouter;

    router.get("/*", serveStaticFiles(roothtml));

    //router.get("/rasters_previews/*", serveStaticFiles(config.pubdir)); // url would be localhost/rasters_previews/123.jpg // было: serveStaticFiles("./files")
    router.get("/rasters_previews/*", serveStaticFiles("./files")); // url would be localhost/rasters_previews/123.jpg
    //writeln(config.pubdir);
    
    router.any("*", &accControl);

    router.any("/checkAuthorization", &checkAuthorization);
    router.any("/login", &login);
    router.post("/logout", &logout);

    router.any("/upload", &upload);    

    router.any("/test", &test);    
    router.any("/dbdata", &dbdata);    

    bool isAuthorizated = false;
    bool isAdmin = false;

    auto settings = new HTTPServerSettings;
    settings.port = 8080;
    settings.bindAddresses = ["::", config.hostname];
    settings.sessionStore = new MemorySessionStore; // SESSION

    writeln("\nHOST: ", config.dbhost);

    writeln("--------sending data---------");

    GeoDataBase gdb = new GeoDataBase(config); // SQLite routines

    listenHTTP(settings, router);
    runEventLoop();
}

void accControl(HTTPServerRequest req, HTTPServerResponse res)
{
    res.headers["Access-Control-Allow-Origin"] = "*";
}

AuthInfo _auth;

void dbSetup()
{
    try
    {
        //getcwd do not return correct path if run from task shoulder
        string dbpath = buildPath((thisExePath[0..((thisExePath.lastIndexOf("\\"))+1)]), dbname);
        if(!dbpath.exists)
        {
            writeln("It's seems you are runnining Application first time\n You should set up admin password");
            auto db = DataBase(dbname); 
            auto usersCollection = db.collection!User("Users", true); // base on struct User
            usersCollection.put(User(0, "admin", "123", "admins", "organisation", "foo@foo.ru")); // defaults
            usersCollection.put(User(1, "user", "123", "users", "organisation", "foo@foo.ru")); // defaults
            writeln("[INFO] db with default credentials created");
        }

        else
        {
            writeln("[INFO] db exists");
            return;
        }
    }

    catch(Exception e)
    {
        writeln("Can't setup DB");
        writeln(e.msg);
        
    }


}

auto usersFromDB() // возвращаемую коллецию используем для проверки есть ли данный пользователь в БД
{
   
    auto db = DataBase(dbname); // users and visitors information
    auto usersCollection = db.collection!User("Users", true); // base on struct User
    if (!db.getCollections().canFind("Users"))
        writeln("[ERROR] DB do not have collection Users");

    auto usersInDb = db.collection!User("Users");
    writeln("collection usersInDb: ", usersInDb);
    return usersInDb;
}


userCredentials checkCurrentUserСredentials(string login, string password) // проверяем того кто логинится на основании данных в БД
{  
    userCredentials usercredentials;

    if (usersFromDB.canFind!(u=>u.login.toLower == login.toLower && u.password.toLower != password.toLower))
    {
        usercredentials.isExists = true;
        usercredentials.passwordOK = false;
        usercredentials.isAdmin = false;
    }

    if (usersFromDB.canFind!(u=>u.login.toLower == login.toLower && u.password.toLower == password.toLower && u.usergroup != "admins"))
    {
        usercredentials.isExists = true;
        usercredentials.passwordOK = true;
        usercredentials.isAdmin = false;
    }

    if (usersFromDB.canFind!(u=>u.login.toLower == login.toLower && u.password.toLower == password.toLower && u.usergroup == "admins"))
    {
        usercredentials.isExists = true;
        usercredentials.passwordOK = true;
        usercredentials.isAdmin = true;
    }

    return usercredentials;
}


void upload(HTTPServerRequest req, HTTPServerResponse res)
{
    writeln("Uploading function");
    string login = req.session.get!string("login"); // user name from session. name need to fill sqlite DB for binding json data and user name
    auto pf = "file" in req.files;
    enforce(pf !is null, "No file uploaded!");
    try moveFile(pf.tempPath, Path("/Files/Shapes") ~ pf.filename);
    catch (Exception e) {
        logWarn("Failed to move file to destination folder: %s", e.msg);
        logInfo("Performing copy+delete instead.");
        copyFile(pf.tempPath, Path(".") ~ pf.filename);
    }

    Json responseStatus = Json.emptyObject;
    responseStatus["status"] = 200;

    res.writeJsonBody(responseStatus);
    //IMPROVEME 1. Есть ограничение по размеру 2. Надо смотреть что в message возвращать надо
    
    // Need run processing in separate process: like: runTask(toDelegate(&myfunction), req);
    // after response process file
    GDAL gdal = new GDAL(config);
    gdal.shapeToGeoJSON(login); // passing current user name
}


void test(HTTPServerRequest req, HTTPServerResponse res)
{
    
        res.writeBody("Hello, World!", "text/plain");
}

// on simple access to /data from browser, browser do not send any JSON, so code will return error 500.
// to prevent it we should handle it
void dbdata(HTTPServerRequest req, HTTPServerResponse res) // process rasters and vector data. Detect request type by JSON body
{
   //IMPROVEME данные отдавать только тем у кого сессия поднята

    /*
    Example of req data:                                     
         {
            "coordinates": "POLYGON ((-48.64196777343751 58.63121664342478, -52.86071777343751 3.8642546157214213, 13.936157226562502 1.7575368113083254, 63.85803222656251 62.2679226294176, 0.9283447265625001 75.05035357407698, -48.64196777343751 58.63121664342478))",
            "enddate": "2017-01-01",
            "apparature": ["aprt1", "aprt2"],
            "request_type": "rasters_previews",
            "processing_type": ["type_of_processing1", "type_of_processing2"],
            "startdate": "2014-01-01"
        }
    */

    GeoDataBase gdb = new GeoDataBase(config); // SQLite routines
    scope(exit) destroy(gdb); // mark instance to GC
    
    // gdb.dbSetup(); // if DB not exists create it.

    // FIXME: Need add checking if `req.json` is empty. It can be ampty if we simply acces to /dbdata URL

    Json request = req.json; // depend of JSON body we should detect what we should do


    // now we should detect what type of data include user request. rasters or vectors
    if(request["request_type"] == "rasters_previews") // getting rasters previews
    {
        res.writeJsonBody(gdb.getIMGsMetadataFromDB(request));
    }

    else if (request["request_type"] == "base_map_vector_layers_names") // только имена и ID 
    {
        res.writeJsonBody(gdb.getBaseMapVectorLayers(request));
    }

    else if (request["request_type"] == "EQ") 
    {
        res.writeJsonBody(gdb.getEQ(request));
    }

    else if (request["request_type"] == "particular_layer") // base map vector layers ВСЕ данные
    {
        res.writeJsonBody(gdb.getBaseMapVectorLayers(request));
    }

    else
    {
        writeln("Unknown request type: ");
        writeln(request["request_type"]);
        res.writeJsonBody(`{"answer": "unknown request type"}`); // remove request!!!
    }

    //res.writeJsonBody(gdb.getIMGsMetadataFromDB(req.bodyReader.readAllUTF8));
    

    //WARINING. For test purpose answer hardcoded 


}


void login(HTTPServerRequest req, HTTPServerResponse res)
{

   Json request = req.json;
    //writeln(to!string(request["username"]));
    writeln("-------------JSON OBJECT from site:-------------");
    writeln(request);
    writeln("^-----------------------------------------------^");
    //readln;

    try
    {      
        auto usercredentials = checkCurrentUserСredentials(request["username"].to!string, request["password"].to!string);
        
        // response. responseBody should be nested in "success" or "fail" block. Like {"fail": {...}}
        Json responseStatus = Json.emptyObject;
        Json responseBody = Json.emptyObject;  //should be _in_

        if (usercredentials.isExists && !usercredentials.passwordOK)
            {
                ////////USER OR PASSWORD WRONG///////////
                responseStatus["status"] = "fail"; // user exists in DB, password NO
                responseBody["password"] = "wrongPassword"; // user exists in DB, password NO
                responseBody["isAuthorized"] = false;
                responseStatus["login"] = responseBody;
                logInfo("-------------------------------------------------------------------------------");
                logInfo(responseStatus.toString); // include responseBody
                logInfo("^-----------------------------------------------------------------------------^");                              
                logWarn("WRONG password for USER: %s", request["username"]); //getting username from request
                //output: {"login":{"isAuthorized":false,"password":"wrongPassword"},"status":"fail"}
            }


            if (usercredentials.isExists && usercredentials.passwordOK)
            {
                ////////ALL RIGHT///////////
                 logInfo("User: %s | Password: %s", request["username"].to!string, request["password"].to!string);
                 
                if (!req.session) //if no session start one
                {
                    req.session = res.startSession();
                }    

                if(usercredentials.isAdmin) // admin group
                {
                try
                  {
                       // Set Session
                       req.session.set!string("login", request["username"].to!string);
                       req.session.set("isAdmin", true); // set шаблонная функция явное указание типа можно опустить

                       responseStatus["status"] = "success";
                       responseBody["isAuthorized"] = true;
                       responseBody["isAdmin"] = true;
                       responseBody["username"] = request["username"].to!string; // admin!
                       responseStatus["login"] = responseBody;

                       logInfo("-------------------------------------------------------------------------------");
                       logInfo(responseStatus.toString); // include responseBody
                       logInfo("^-----------------------------------------------------------------------------^");
                       logInfo("Admin session for user: %s started", request["username"].to!string);
                       // {"login":{"isAuthorized":true,"isAdmin":true,"username":"admin"},"status":"success"}
                    }

                    catch(Exception e)
                    {
                        writeln("Error during admin login:", request["username"].to!string);
                        writeln(e.msg);
                    }
                }
                if(!usercredentials.isAdmin) // start user session
                {
                    try
                    {
                       req.session.set("login", request["username"].to!string); //set current username in parameter of session name
                       req.session.set("isAdmin", false); // set шаблонная функция явное указание типа можно опустить

                       responseStatus["status"] = "success";
                       responseBody["isAuthorized"] = true;
                       responseBody["isAdmin"] = false;
                       responseBody["username"] = request["username"].to!string; // user!
                       responseStatus["login"] = responseBody;

                       logInfo("-------------------------------------------------------------------------------");
                       logInfo(responseStatus.toString); // include responseBody
                       logInfo("^------------------------------------------------------------------------------^");
                       logInfo("User session for user: %s started", _auth.user.login);
                   // {"login":{"isAuthorized":true,"isAdmin":false,"username":"test"},"status":"success"}

                        logInfo(responseStatus.toString);
                        //res.writeJsonBody(responseStatus);
                    
                    }

                    catch (Exception e)
                    {
                        writeln("Error during user login:");
                        writeln(e.msg);
                    }
                }
 
            }

            if (!usercredentials.isExists)
            {
                responseStatus["status"] = "fail"; // user exists in DB, password NO
                responseBody["username"] = "userDoNotExists"; // user exists in DB, password NO
                responseBody["isAuthorized"] = false;
                responseStatus["login"] = responseBody;
                logInfo("-------------------------------------------------------------------------------");
                logInfo(responseStatus.toString); // include responseBody
                logInfo("^-----------------------------------------------------------------------------^");                              
                logWarn("User %s DO NOT exist in DB", request["username"]); //getting username from request

            }

            res.writeJsonBody(responseStatus); //Final answer to server. Must be at the end


    }

    catch(Exception e)
    {
        writeln("Can't process select from DB");
        writeln(e.msg);
    }


}


void checkAuthorization(HTTPServerRequest req, HTTPServerResponse res)
{
    logInfo("-----checkAuthorization START-----");
    Json responseStatus = Json.emptyObject;
    Json responseBody = Json.emptyObject;  //should be _in_ responseStatus
    //if user already on site
    if (req.session)
    {
        logInfo("user already have active session");

        responseStatus["status"] = "success";
        responseBody["isAuthorized"] = true;
        responseBody["isAdmin"] = false;
        responseBody["username"] = req.session.get!string("login");
        responseStatus["login"] = responseBody;
        writeln(req.session.get!string("login"));
        if(req.session.get!bool("isAdmin"))
        {
            responseBody["isAdmin"] = true;
        }

        // Проверить JSON который выше куда он и как
        res.writeJsonBody(responseStatus);
        logInfo(responseStatus.toString); // include responseBody

    //example: {"login":{"isAuthorized":true,"isAdmin":false,"username":"test"},"status":"success"}

    }
    // Login info we should check only with /login
    else
    {
        // checkAuthorization запрашивается при каждом обращении к сайту
        // для неавторизованных пользователей нужно проверять в коллекции visitors какие тесты были пройдены
        // при старте теста когда коллеция пустая вернется пустой result поэтому нужно ниже проверять не пуст ли он прежде чем брать элементы
        responseStatus["status"] = "success";
        responseBody["isAuthorized"] = false;
        responseBody["isAdmin"] = false;
        responseBody["username"] = "guest";
        
        responseStatus["login"] = responseBody;

        writeln(responseStatus);
        res.writeJsonBody(responseStatus);

    }

    logInfo("-----checkAuthorization END-------");

}


void logout(HTTPServerRequest req, HTTPServerResponse res)
{
    try
    {
        logInfo("Logout section");
        Json request = req.json;
        Json responseBody = Json.emptyObject; // function duplicate from login

        if (req.session) // if user have active session
        {
            res.terminateSession();
            responseBody["status"] = "success";
            responseBody["isAuthorized"] = false;
            logInfo("-------------------------------------------------------------------------------");
            logInfo(responseBody.toString);
            logInfo("^-----------------------------------------------------------------------------^");                              
            logInfo("User %s logout", request["username"]); //
        }

        else
        {
            responseBody["status"] = "fail"; // user do not have active session?
            logInfo("User do not have active session"); 
            res.writeJsonBody(responseBody);
        }

    res.writeJsonBody(responseBody);    

    }

    catch (Exception e)
    {
        logInfo(e.msg);
    }
}
