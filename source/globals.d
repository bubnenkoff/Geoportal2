module globals;

import std.stdio;
import vibe.d;
import std.datetime;

import vibe.data.json;

// global variables for all project like current DateTime

DateTime currentdt;
string datestamp;
FileLogger fLogger;

shared static this()
{
	currentdt = cast(DateTime)(Clock.currTime()); 
   	datestamp = currentdt.toISOExtString; // YYYY-MM-DD
}


struct ImgMetadata
{
    string id;
    string name;
    string apparature;
    string processing_type;
    string date;
    string imageBounds;
    // string coordinates; координаты там возвразать не нужно. отрисовка идет по границам imageBounds
}


struct VectorMetadata
{
    string id;
    string name;
    string coordinates;
}

struct EQMetadata
{
    string id;
    string date;
    string eqBounds;
    string magnitude;
    string regionname;
    string coordinates;
}
