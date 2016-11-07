module globals;

import std.stdio;
import std.datetime;

import vibe.data.json;

// global variables for all project like current DateTime

DateTime currentdt;
string datestamp;

shared static this()
{
	currentdt = cast(DateTime)(Clock.currTime()); 
   	datestamp = currentdt.toISOExtString; // YYYY-MM-DD
}


struct ImgMetadata
{
    string id;
    string img_src;
    string img_type;
    string coordinates;
    string name;
    string datetime;
    string imageBounds;
}

ImgMetadata [] imgmetadatas; // declarated in global
ImgMetadata imgmetadata;


struct VectorMetadata
{
    string id;
    string name;
    string coordinates;
}

//VectorMetadata [] vectormetadatas; // declarated in global
//VectorMetadata vectormetadata;

struct EQMetadata
{
    string id;
    string date;
    string eqBounds;
    string magnitude;
    string regionname;
    string coordinates;
}

//EQMetadata [] eqmetadatas; // declarated in global
//EQMetadata eqmetadata;