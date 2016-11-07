module gdalprocessing;

import std.stdio;
import std.process : executeShell;
import std.file;
import std.path;
import std.datetime;
import std.conv;

import dbconnect;
import parseconfig;

import globals;

class GDAL 
{
	Config config;

	this(Config config)
	{
		this.config = config;
	}

	// convert user upload to geojson
	void shapeToGeoJSON(string login)
	{
		writeln("shapeToGeoJSON");
		writeln("000");
		auto listOfShapes = dirEntries(buildPath(getcwd, `Files/Shapes/`, `*.{shp}`), SpanMode.shallow);
		writeln("111");
		writeln(buildPath(getcwd, "Files/Shapes/"));

		int totalShapes = 0;
		int successfullyConvertedShapes = 0;
		string [] successShapeNames;

		GeoDataBase gdb = new GeoDataBase(config); // instance for working with DB

		foreach(shape;listOfShapes)
		{
			writeln("inside foreach loop");
			string command = `ogr2ogr -f GeoJSON ./Files/Shapes/output.geojson ` ~ shape;
			auto ls = executeShell(command);

			if (ls.status == 0) // success
			{
				writeln("Converted to geoJSON: ", shape);
				successfullyConvertedShapes++;
				successShapeNames ~= shape;
	        	string geoJSONContentAsString = readText(buildPath(getcwd, "Files/Shapes/output.geojson"));
				// every success geojson should be send to SQLite
				gdb.dbInsert(login, datestamp, "somegeometrytype", geoJSONContentAsString); //IMPROVEME: detecting shape geometry type
			}
			else
				writeln("failed to convert shp to geojson: ", shape);
			totalShapes++;
		}

		writeln("Total Shapes: %s Successfully converted to GeoJSON: %s", totalShapes, successfullyConvertedShapes);
				
		
	}

}

