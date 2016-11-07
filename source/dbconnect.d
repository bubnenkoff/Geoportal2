module dbconnect;

import std.stdio;
import std.file;
import std.string;
import std.array;
import std.conv;
import std.path;
import std.range;
import std.format;
import std.algorithm;
import std.datetime;
import std.conv;

import ddbc.all;

import vibe.data.json;

import parseconfig;

import globals;


// SQLLite will store shp converted to geoJSON

class GeoDataBase
{
	Config config;
	MySQLDriver driver;
	DataSource ds;
	Connection conn;

	this(Config config)
	{
		this.config = config;
	 	driver = new MySQLDriver();
	 	string[string] params;
	    string url = MySQLDriver.generateUrl(config.dbhost, to!ushort(config.dbport), config.dbname);
	    params = MySQLDriver.setUserAndPassword(config.dbuser, config.dbpass);
	    ds = new ConnectionPoolDataSourceImpl(driver, url, params);
		conn = ds.getConnection();
	    
	}	



	void dbInsert(string login, string uploading_date, string geometry_type, string data)
	{
	   
	    Statement stmt = conn.createStatement();
		string sqlinsert = (`INSERT INTO usersshapes (userlogin, uploading_date, geometry_type, data) VALUES ('%s', '%s', '%s', '%s') `, login, uploading_date, geometry_type, data); 
		stmt.executeUpdate(sqlinsert);
		scope(exit) stmt.close(); // closing

	}

	Json getIMGsMetadataFromDB(Json request) // return JSON with data
	{
		debug 
		{
			writeln("User request from site: ");
			writeln(request);
			writeln;
		}

     	// some processing of request
		

		/*
		 Example of correct request from SQLManager:

			SELECT id, path, ST_AsWKT(Coordinates) FROM rasters_previews  WHERE 
	        ST_Intersects(Coordinates, 
	            GEOMFROMTEXT('POLYGON((-48.64196777343751 58.63121664342478, -52.86071777343751 3.8642546157214213, 13.936157226562502 1.7575368113083254, 63.85803222656251 62.2679226294176, 0.9283447265625001 75.05035357407698, -48.64196777343751 58.63121664342478))', 0 )
	        );
        */

	    /*
	    	Example of req data:                                     
	         {
	            "coordinates": "POLYGON ((-48.64196777343751 58.63121664342478, -52.86071777343751 3.8642546157214213, 13.936157226562502 1.7575368113083254, 63.85803222656251 62.2679226294176, 0.9283447265625001 75.05035357407698, -48.64196777343751 58.63121664342478))",
	            "enddate": "2017-01-01",
	            "request_type": "rasters_previews",
	            "startdate": "2014-01-01"
	        }
	    */
	    
	    /*
	    	request["coordinates"]);
	    	print:
	    	"POLYGON ((-16.927185058593754 55.07836723201515, 16.119689941406254 21.616579336740617, 51.80328369140626 57.51582286553883, 16.998596191406254 60.06484046010452, -16.927185058593754 55.07836723201515))"

	    */
		writeln(`request["types"]: `, request["types"]);

	    string img_type_regexp;
	    if(request["types"].toString == "[]") // если запрос прилетел пустой селект пустым `[]` будет падать поэтому нужно создать временную переменную и туда что то положить
	    {
	    	img_type_regexp = "0"; // просто пустышку ставим, аначе при селекте будет падать
	    }
	    else
	    {
	    	// для выполенния запроса к БД нужно привести содержимое поля к виду REGEXP т.е. : WHERE img_type REGEXP 'vis|ir'
	    	// сейчас поле содержит: ["img_vis","img_ir","img_rgb"]
	    	img_type_regexp = request["types"].toString().replace(`","`,`|`).replace(`["`,``).replace(`"]`,``);
	    }


	   scope(exit) conn.close();

	   Statement stmt = conn.createStatement();
	   scope(exit) stmt.close(); // close on exit
	   // put `coordinates` as value for SELECT 
	   // пример: SELECT imgs.img_id, img_params.Coordinates, imgs.name, imgs.imgDateTime, img_params.imageBounds FROM imgs INNER JOIN img_params ON imgs.src_id = img_params.id WHERE imgs.reproj_status='DONE';
//	   string sqlSelect = `SELECT id, ST_AsWKT(Coordinates), Name, Date, imageBounds FROM rasters_previews WHERE ST_Intersects(Coordinates, GEOMFROMTEXT('` ~  to!string(request["coordinates"]).replace(`"`,``) ~ `', 0 ));`; // do not forget remove quotes
	   string sqlSelect = `SELECT imgs.img_id, img_src, img_type, ST_AsWKT(img_params.Coordinates), imgs.name, DATE_FORMAT(imgs.imgDateTime, '%Y-%m-%d'), img_params.imageBounds FROM imgs INNER JOIN img_params ON imgs.src_id = img_params.id WHERE imgs.reproj_status='DONE' AND ST_Intersects(Coordinates, GEOMFROMTEXT('` ~  to!string(request["coordinates"]).replace(`"`,``) ~ `', 0 )) AND img_type REGEXP '` ~ img_type_regexp ~ `' AND imgDateTime BETWEEN '` ~ request["startdate"].get!string ~ `' AND '` ~  request["enddate"].get!string ~ `';`; // do not forget remove quotes
	   writeln(sqlSelect);
	   writeln("^^^sqlSelect^^^");
	  // readln;
	   	debug 
	   	{
	   		writeln("SQL request to get interesected rasters_previews: ");
	   		writeln(sqlSelect);
	   		writeln;
	   	}
	   auto rs = stmt.executeQuery(sqlSelect);
	    
	   int imgFounded = 0;

	    string imgmetadataAsString;
		while (rs.next())
		{
    		imgFounded++;	
			imgmetadata.id = to!string(rs.getInt(1));
			imgmetadata.img_src = to!string(rs.getString(2));
			imgmetadata.img_type = to!string(rs.getString(3));
			imgmetadata.coordinates = to!string(rs.getString(4));
			imgmetadata.name = to!string(rs.getString(5));
			imgmetadata.datetime = to!string(rs.getString(6));
			imgmetadata.imageBounds = to!string(rs.getString(7));

			imgmetadatas ~= imgmetadata;
			imgmetadataAsString ~= serializeToJsonString(imgmetadata) ~ `, `;

		}

		
		imgmetadataAsString = imgmetadataAsString.replaceLast(`,`,``); // fix issue with trail comma

		Json imgTotalCount = Json.emptyObject;
		imgTotalCount["imgTotalCount"] = imgFounded; // { "imgTotalCount": 0 } // we should append it for

		// It's better to add section named: { "imgTotalCount": 0 }
		// If nothing in DB it would be set to zero
		Json imgsMetadata = Json.emptyArray;

		if (imgFounded == 0) // NO IMGs
		{
			writeln("No IMGs in DB for selected region: ", imgFounded);
			string result = `[` ~ imgTotalCount.toString ~ `]`;
			imgsMetadata = parseJson(result); // imgTotalCount should be as array []
		}

		else
		{
			writefln("IMGs in current selected region: %s ", imgFounded);
			writeln;
			string result = `[` ~ imgTotalCount.toString ~ `, ` ~ imgmetadataAsString ~ `]`; // need add field { "imgTotalCount": 0 } // square brackets because array

			imgsMetadata = parseJson(result);

			writeln(imgsMetadata.toString);
		}
		

		writeln("-------");
		writeln(imgsMetadata);
		writeln("-------");

		
		return imgsMetadata; // return FULL dataset OR { "imgTotalCount": 0 }
		
		
		/* Return SUCCESS
			Example ingmetadataAsString:

			{"id":"0","path":"D:/code/geoportal/IMGs/123.jpg","coordinates":"POLYGON((16.706 15.576,12.563 14.603,13.294 10.094,17.431 10.978,16.706 15.576))"}, {"id":"0","path":"D:/code/geoportal/exmapleIMG/321/101_005329_2_0_03/101_005329_2_0_03.jpg","coordinates":"POLYGON((12.562 14.603,8.416 13.653,9.156 9.205,13.294 10.094,12.562 14.603))"}, {"id":"0","path":"D:/code/geoportal/exmapleIMG/321/101_005386_3_0_02/101_005386_3_0_02.jpg","coordinates":"POLYGON((18.203 12.002,14.064 11.02,14.417 6.424,18.556 7.309,18.203 12.002))"}
		*/

		/* Return no data in DB:
		{ "imgTotalCount": 0 }

		*/


	}


	Json getBaseMapVectorLayers(Json request) // return JSON with data
	{
		VectorMetadata vectormetadata;
		VectorMetadata [] vectormetadatas; // declarated in global
		

		Json vectorMetadata = Json.emptyArray; // Это поле мы заполним ниже

	   Statement stmt = conn.createStatement();
	   scope(exit) stmt.close(); // close on exit

	   string sqlSelect;

	   writeln("request_type: ", request["request_type"]);

	   if(request["request_type"] == "base_map_vector_layers_names") // Только имена слоев и ИД
	   {
	   		sqlSelect = `SELECT OGR_FID, name FROM base_map;`; 
	   		writeln("request for base layers names: ");
	   		writeln(sqlSelect);

	   		auto rs = stmt.executeQuery(sqlSelect);

		    //string imgmetadataAsString; // Надо подумать как отдавать
			while (rs.next())
			{
				vectormetadata.id = to!string(rs.getInt(1));
				vectormetadata.name = to!string(rs.getString(2));
				writeln(vectormetadata.name);
				vectormetadatas ~= vectormetadata;

			}

			return vectormetadatas.serializeToJson(); // return to caller data. Caller is: res.writeJsonBody(

	   }

	   else if (request["request_type"] == "particular_layer")
	   {
	   		sqlSelect = `SELECT OGR_FID, name, ST_AsWKT(shape) FROM base_map WHERE OGR_FID=` ~ request["layer_id"].toString ~ `;`; // DB currently do not have support of ST_asGeoJSON. So we will parse in browser	
	
	   	   auto rs = stmt.executeQuery(sqlSelect);

		    //string imgmetadataAsString; // Надо подумать как отдавать
			while (rs.next())
			{
				vectormetadata.id = to!string(rs.getInt(1));
				vectormetadata.name = to!string(rs.getString(2));
				vectormetadata.coordinates = to!string(rs.getString(3));

				vectormetadatas ~= vectormetadata;

			}
			Json eqTotalCount = Json.emptyObject;

			return vectormetadatas.serializeToJson(); // return to caller data. Caller is: res.writeJsonBody(

	   }


	   	return vectormetadatas.serializeToJson();
	   
	}


	Json getEQ(Json request) // return JSON with data
	{
	
		EQMetadata [] eqmetadatas; // declarated in global
		EQMetadata eqmetadata;

	   Statement stmt = conn.createStatement();
	   scope(exit) stmt.close(); // close on exit

	   string sqlSelect = `SELECT id, DATE_FORMAT(date, '%Y-%m-%d %H:%i'), eqBounds, magnitude, regionname, ST_AsWKT(coordinates) from eq WHERE magnitude >=` ~ request["magnitude"].toString ~ ` AND date BETWEEN '` ~ request["startdate"].get!string ~ `' AND '` ~  request["enddate"].get!string ~ `';`; // do not forget remove quotes
	   debug 
	   	{
	   		writeln("SQL request to get EQ: ");
	   		writeln(sqlSelect);
	   		writeln;
	   	}

	   try
	   {
		auto rs = stmt.executeQuery(sqlSelect);

		    //string imgmetadataAsString; // Надо подумать как отдавать
		    int eqCount = 0;
			while (rs.next())
			{
				
				eqmetadata.id = to!string(rs.getInt(1));
				eqmetadata.date = to!string(rs.getString(2)); // Нельзя чтобы в БД было нулевое значение
				eqmetadata.eqBounds = to!string(rs.getString(3));
				eqmetadata.magnitude = to!string(rs.getString(4));
				eqmetadata.regionname = to!string(rs.getString(5));
				eqmetadata.coordinates = to!string(rs.getString(6));
				eqmetadatas ~= eqmetadata;
				//imgmetadataAsString ~= serializeToJsonString(vectormetadata) ~ `, `;
				eqCount++;
			}


			if (eqCount == 0) // NO EQs
			{
				Json eqObject = Json.emptyObject;
				eqObject["eqTotalCount"] = eqCount; 
				return eqObject;
			}

	   }
	   catch(Exception e)
	   {
	   		writeln(e.msg);
	   }
		
		writeln(eqmetadatas.serializeToJson());

		return eqmetadatas.serializeToJson(); // return to caller data. Caller is: res.writeJsonBody(

	}


}