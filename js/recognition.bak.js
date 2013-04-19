(function (unsafeWindow) {
(function(){
var keywords = {
	AUDIO: ["2CH", "5.1CH", "5.1", "AAC", "AC3", "DTS", "DTS5.1", "DTS-ES", "DUALAUDIO", "DUAL AUDIO", "FLAC", "MP3", "OGG", "TRUEHD5.1", "VORBIS"],
	EXTENSION: ["AVI", "MKV", "MP4", "OGM", "RM", "RMVB", "WMV", "DIVX", "MOV", "FLV", "MPG"],
	EXTRA:["ASS", "BATCH", "BD", "BDRIP", "BLURAY", "BLU-RAY", "COMPLETE", "DIRECTOR'S CUT", "DVD", "DVD5", "DVD9", "DVD-R2J", "DVDRIP", "ENG", "ENGLISH", "HARDSUB", "PS3", "R2DVD", "R2J", "R2JDVD", "RAW", "REMASTERED", "SOFTSUB", "SUBBED", "SUB", "UNCENSORED", "UNCUT", "VOSTFR", "WEBCAST", "WIDESCREEN", "WS"],
	EXTRA_UNSAFE:["END", "FINAL", "OAV", "ONA", "OVA", "SPECIAL", "MOVIE"],
	VERSION:["V0", "V2", "V3", "V4"],
	VIDEO:["8BITS", "8BIT", "10BITS", "10BIT", "AVI", "DIVX", "H264", "H.264", "HD", "HDTV", "HI10P", "HQ", "LQ", "RMVB", "SD", "TS", "VFR", "WMV", "X264", "X.264", "XVID"],
	EPISODE:["EPISODE", "EP.", "EP", "VOLUME", "VOL.", "VOL", "EPS.", "EPS"],
	EPISODE_PREFIX:["EP.", "EP", "E", "VOL.", "VOL", "EPS.", "\x7B2C"]
}

function Anime(filename){
	this.id;
	this.audioType = [];
	this.checkSum;
	this.extras = [];
	this.file;
	this.extention;
	this.group;
	this.name;
	this.episode;
	this.resolution;
	this.title;
	this.cleanTitle;
	this.version;
	this.videoType = [];

	this._parseFile = function(){
		if(!this.file){
			return false;
		}
		//replace underscores
		var f = this.file;
		f = f.replace(/_/g," ");

		// =======================================================================================
		// Extention

		var ext = f.match(/\..{3,5}$/);
		if(ext){
			this.extention = ext[0].substr(1);
			f=f.replace(/\..{3,5}$/,"");
		} 

		delete(ext);

		// =======================================================================================
		// Tokens
		
		var tokens = f.match(/((?:\[.*?\])|(?:\([^\(]*?\))|(?:\{.*?\}))/g);

		if(tokens){

			//loop tokens
			for (var i=0;i < tokens.length; i++) {

				// remove tokens from f
				f = f.replace(tokens[i],"");

				// remove [](){}
				tokens[i] = tokens[i].replace(/[\[\]\(\)\{\}]/g, "");

				// if the token contains subtoken, add them to the array
				if(tokens[i].match(/[ _]/)){
					tokens = tokens.concat(tokens[i].split(/[ _]/));
					continue;
				}

				var tokenU = tokens[i].toUpperCase();

				// checksum
				if(tokenU.match(/[0-9A-F]{8}/i)){
					//console.log('Checksum token: '+tokenU);
					this.checkSum = tokenU;
					continue;
				}
				// resolution
				if(tokenU.match(/[0-9]{3,4}X[0-9]{3,4}/i) || tokenU.match(/[0-9]{3,4}[PI]/i)){
					this.resolution = tokenU;
					continue;
				}
				// audioType
				if(~keywords.AUDIO.indexOf(tokenU)){
					this.audioType.push(tokenU);
					continue;
				}
				// videoType
				if(~keywords.VIDEO.indexOf(tokenU)){
					this.videoType.push(tokenU);
					continue;
				}
				// extra tags
				if(~keywords.EXTRA.indexOf(tokenU)){
					this.extras.push(tokenU);
					continue;
				}
				// unsafe extra tags
				if(~keywords.EXTRA_UNSAFE.indexOf(tokenU)){
					this.extras.push(tokenU);
					continue;
				}

				// subgroups
				this.group = tokens[i];

			};
			//console.log("f: "+f);
		} else {
			console.log('No Tokens found, lets try something else');
			var fU = f.toUpperCase();
			var n;

			// checksum
				if(n = fU.match(/[0-9A-F]{8}/i)){
					//console.log('Checksum token: '+n);
					this.checkSum = n.join(" ");
				}
				// resolution
				if(n = fU.match(/[0-9]{3,4}X[0-9]{3-4}/i)){
					//console.log('Resolution token: '+n);
					this.resolution = n.join(" ");
				}

				if(n = fU.match(/[0-9]{3,4}[PI]/i)){
					//console.log('Resolution token: '+n);
					this.resolution = n.join(" ");
				};
		} 

		// =======================================================================================
		// Outside the Tokens

		var w;
		// Trim Episode Prefixes
		for (var e = 0; e < keywords.EPISODE.length - 1;e++) {
			w = f.toUpperCase().indexOf(keywords.EPISODE[e]);
			if(~w && f[w-1].match(/[_ .]/)){
				f = f.substr(0,w) + f.slice(w+keywords.EPISODE[e].length);
				// special Rule, number comes later
				if(~keywords.EPISODE[e].indexOf('VOL')) this.episode = 'Vol. ';
			}
		};

		if(w = f.match(/([0-9]{3,4}X[0-9]{3-4})/i)){
			//console.log('Resolution token: '+n);
			this.resolution = w[1];
			f=f.replace(w[1],"");
		}
		if(w = f.match(/([0-9]{3,4}[PI])/i)){
			//console.log('Resolution token: '+n);
			this.resolution = w[1];
			f=f.replace(w[1],"");
		}
		
		// Trim Version numbers
		if(w = f.match(/[0-9]{1,3}(v[0-9]{1})/)){
			this.version = w[1];
			f = f.replace(w[1],"");
		}

		// =======================================================================================
		// Cleanup & Final Spurt
		f = f.replace(/^[. -]+/,"");
		f = f.replace(/[. -]+$/,"");

		//get episode number
		if(n = f.match(/-? ([0-9]*\-?[0-9]+)$/)){
			this.episode = n[1];
			f = f.replace(n[1], "");
		} else if(n = f.match(/-? S[0-9]{1,2}E([0-9]{1,3})/i)){
			this.episode = n[1];
			f = f.replace(n[0],"");
		}

		// some more cleaning up
		f = f.replace(/[. -]+$/,"");

		// I guess nothing is left anymore, so this must be the title
		this.name = f.replace("."," ");

	}

	if(filename) {
		this.file = filename;
		this._parseFile();
	}

	this._clear = function(){
		this.id=null; this.audioType=null; this.checkSum=null; this.extras=[]; this.file=null; this.format=null; this.group=null; this.name=null; this.number=null; this.resolution=null; this.title=null; this.cleanTitle=null; this.version=null; this.videoType=null;
	}

}
window.Anime = Anime;
})(window)
})(window);