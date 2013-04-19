// =========================================================================================================
// @name		AnimeFile Recognition
// @namespace	http://myanimelist.net/profile/Talon/
// @author		Talon
// @version		1.0
// @description	Parses through an anime filename and returns what it can find in a class
// @copyright	none, but I love to see where it's used
// =========================================================================================================

(function(){

// Keyword list 
//for easily adding stuff that are missing
// =========================================================================================================
var keywords = {
	AUDIO: ["2CH", "5.1CH", "5.1", "AAC", "AC3", "DTS", "DTS5.1", "DTS-ES", "DUALAUDIO", "DUAL AUDIO", "FLAC", "MP3", "OGG", "TRUEHD5.1", "VORBIS"],
	EXTRA:["ASS", "BATCH", "BIG5", "BD", "BDRIP", "BLURAY", "BLU-RAY", "TV", "COMPLETE", "DIRECTOR'S CUT", "DVD", "DVD5", "DVD9", "DVD-R2J", "DVDRIP", "ENG", "ENGLISH", "GB", "HARDSUB", "JAP", "PS3", "R2DVD", "R2J", "R2JDVD", "RAW", "REMASTERED", "SOFTSUB", "SUBBED", "SUB", "UNCENSORED", "UNCUT", "VOSTFR", "WEBCAST", "WIDESCREEN", "WS"],
	EXTRA_UNSAFE:["END", "FIN", "FINAL", "OAV", "ONA", "OVA", "SPECIAL","SP", "MOVIE"],
	VIDEO:["8BITS", "8BIT", "10BITS", "10BIT", "10-BIT", "AVI", "DIVX", "H264", "H.264", "HD", "HDTV", "HI10P", "HQ", "LQ", "RMVB", "SD", "TS", "VFR", "WMV", "X264", "X.264", "XVID"],
	EPISODE:["EPISODE", "EP.", "EP", "VOLUME", "VOL.", "VOL", "EPS.", "EPS"]
}


// regexp patterns
// we define them at the very top so the native regexp engine can render them before we use them
// =========================================================================================================
var patt_extras 		= new RegExp(" ("+keywords.EXTRA.join("|")+")(?: |$)","i"),			// see above
	patt_extras_unsafe 	= new RegExp(" ("+keywords.EXTRA_UNSAFE.join("|")+")(?: |$)","i"),
	patt_video		 	= new RegExp(" ("+keywords.VIDEO.join("|")+")(?: |$)","i"),
	patt_audio		 	= new RegExp(" ("+keywords.AUDIO.join("|")+")(?: |$)","i"),
	patt_resolution 	= /([0-9]{3,4}X[0-9]{3,4}|[0-9]{3,4}[PI]|1080)/i,					// 1280x720 848x480 720P 1080i
	patt_version 		= /(?:[0-9]{1,3}| )(v[0-9]{1})/i,									// 01v0
	patt_episode_number	= /(?:-? |-)([0-9]{0,3}\-?[0-9]{1,3})$|S[0-9]{1,2}E([0-9]{1,3})$/,	// - 01   - 03-05   - S1E11
	patt_token_encloser = /((?:\[.*?\])|(?:\(.*?\)?\))|(?:\{.*?\}))/g,						// [whatever-subs] (10BIT FLAC ASS) {lolz}
	patt_token_capsule	= /[\[\]\(\)\{\}]/g,												// [](){}
	patt_token_seperator= /([\-\ \_\+\,]|\.)(?:[^0-9])/,										// - _+.,
	patt_checksum		= /[0-9A-F]{8}/i,													// 680461C2
	patt_extention		= /\.(.{3,5})$/;													// .mkv


// "Anime" Class
// =========================================================================================================
function Anime(_filename){
	this.id;
	this.title;
	this.cleanTitle;
	this.version;
	this.episode 		= "";
	this.group			= [];
	this.resolution 	= [];
	this.videoType 		= [];
	this.audioType 		= [];
	this.extras 		= [];
	this.extras_unsafe 	= [];
	this.checkSum;
	this.extention;

	this.file;
	this.filename;

	if(_filename) {
		this.file = _filename;											// < this one gets raped by the parser
		this.filename = _filename;										// < our life insurance
		parseFile(this);
	}
}


// Tokens "Class" and Creator
// I'm skipping some steps of the original engine because regexps are insane strong in JS
// If you're interested in the real thing take a look here https://code.google.com/p/taiga/
// =========================================================================================================
function Token(c){
	this.content = c;
	this.seperator = (c.match(patt_token_seperator)?c.match(patt_token_seperator)[1]:false);
	this.virgin = true;
}


// Parser for Anime files
// =========================================================================================================
function parseFile(anime){

	if(!anime.file) return false;

	anime.file = anime.file.replace(/_/g," ");							// clear underscores
	getExtention(anime);												// clear extention

	// Inside Tokens (duhuhu.. inside..)
	// =====================================================================================================
	
	var tokens = getCapsuledTokens(anime);
	if(tokens){
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			findChecksum(token,anime);									// checksum is quite lonely..
			if(!token.virgin) continue; 								// ..99.9% of the time ;__;
			findResolution(token,anime);								// resolution
			if(token.content=="") continue;
			findInToken(keywords.AUDIO, token, anime.audioType);		// audioType
			if(token.content=="") continue;
			findInToken(keywords.VIDEO, token, anime.videoType);		// videoType
			if(token.content=="") continue;
			findInToken(keywords.EXTRA, token, anime.extras);			// extras
			if(token.content=="") continue;
			findInToken(keywords.EXTRA_UNSAFE, token, anime.extras);	// unsafe extras
			if(token.content=="") continue;
			if(token.virgin) anime.group.push(token.content);			// if it's still a virgin 
		};																// after all those violations, 
	}																	// it must be a subgroup..
	// Outside Tokens
	// =====================================================================================================
	findOutside(patt_resolution, 	anime, anime.resolution);			// resolution again
	findOutside(patt_audio, 		anime, anime.audioType);			// audio again
	findOutside(patt_video, 		anime, anime.videoType);			// video again
	findOutside(patt_extras, 		anime, anime.extras);				// extras again
	findOutside(patt_extras_unsafe, anime, anime.extras_unsafe);		// unsafe extras again
	anime.file = cleanup(anime.file);									// clean file

	// Episode Number
	// =====================================================================================================
	var w;

	for (var e = 0; e < keywords.EPISODE.length - 1;e++) {				// trim episode prefixes
		w = anime.file.toUpperCase().indexOf(keywords.EPISODE[e]);
		if(~w && anime.file[w-1].match(/[_ .]/)){
			anime.file = anime.file.substr(0,w) + anime.file.slice(w+keywords.EPISODE[e].length);
			if(~keywords.EPISODE[e].indexOf('VOL'))						// special rule for vol
				anime.episode = 'Vol. ';
		}
	};

	if(w = anime.file.match(patt_version)){								// trim version numbers
		anime.version = w[1];
		anime.file = anime.file.replace(w[1],"");
	}

	if(w = anime.file.match(patt_episode_number)){						// Get episode number
		anime.episode += (w[1]? w[1]:w[2]);
		anime.file = anime.file.replace(w[0], "");
	}

	anime.file = cleanup(anime.file);									// some more cleaning

	// I guess nothing is left anymore, so this must be the title
	// =====================================================================================================
	anime.title = anime.file.replace("."," ");
	anime.cleanTitle = anime.title.replace(/[^a-z0-9 !\']/ig," ");		// trim special chars
}


// Filter functions
// =========================================================================================================
function getCapsuledTokens(obj){
	var t = obj.file.match(patt_token_encloser);
	if(t){
		for (var i = 0; i < t.length; i++) {
			obj.file = obj.file.replace(t[i],"");
			t[i] = new Token(t[i].replace(patt_token_capsule, ""));
		};
	}
	obj.file.replace(patt_token_capsule, "");	// trim orphans
	return t;
}

function getExtention(obj){
	var ext = obj.file.match(patt_extention);
	if(ext){
		obj.extention = ext[1];
		obj.file=obj.file.replace(ext[0],"");
	} 
}

function findChecksum(token,obj){
	if(token.content.match(patt_checksum)){
		obj.checkSum = token.content;
		token.virgin = false;
	}
}

function findResolution(token,obj){
	var n;
	while(n=token.content.match(patt_resolution)){	
		obj.resolution.push(n[0].toUpperCase());
		token.content=token.content.replace(n[0],"");
		token.virgin = false;				
	} 
}

function findInToken(keywords,token,result){							//TODO: needs a rewrite to regexp, see below
	var n = token.content.toUpperCase();
	n = (token.seperator ? n.split(token.seperator) : [n]);
	for (var i = n.length - 1; i >= 0; i--) {
		if(~keywords.indexOf(n[i])){
			result.push(n.splice(i,1));
			token.virgin = false;
		}
	};
	if(!token.virgin) token.content = n.join(token.seperator); 			// cuddling after sex
}

function findOutside(pattern, obj, result){
	while(w = obj.file.match(pattern)){
		result.push(w[1]);
		obj.file=obj.file.replace(w[1],"");
	}
}

function cleanup(file){
	return file.replace("  ", " ").replace(/(^[\. \-]+|)/,"").replace(/[\. \-\[\]]+$/,"");
}

window.Anime = Anime;	// new Anime(filename);
})(window)