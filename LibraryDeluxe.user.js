// ==UserScript==
// @name       Library Deluxe
// @namespace  http://use.i.E.your.homepage/
// @version    1
// @description  Bla
// @match      http://tokyotosho.info/*
// @copyright  2012+, You
// @require    http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==


/* --------------------------------------------------------
 * Prototyping the Strings
 * ------------------------------------------------------ */

String.prototype.hashCode = function(){
	var hash = 0, i, char;
	if (this.length == 0) return hash;
	for (i = 0; i < this.length; i++) {
		char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
};

// Compute the edit distance between the two given strings
String.prototype.distanceTo = function(a){
	if(a.length == 0) return this.length; 
	if(this.length == 0) return a.length; 

	var matrix=[], i=0, j=0;
	for(i; i <= this.length; i++){matrix[i] = [i];}
	for(j; j <= a.length; j++){matrix[0][j] = j;}

	for(i = 1; i <= this.length; i++){for(j = 1; j <= a.length; j++){
		if(this.charAt(i-1) == a.charAt(j-1)){
			matrix[i][j] = matrix[i-1][j-1];
		} else {
			matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
		}
	}}
	return matrix[this.length][a.length];
};


// 1 - anime *
// 10 - non-english *
// 3 - manga ^
// 11 - batch *
// 8 - drama
// 2 - music
// 9 - music video
// 7 - raws *
// 4 - hentai *
// 12 - hentai (anime) *
// 13 - hentai (manga) ^
// 14 - hentai (game)
// 15 - jav
// 5 - other


/* --------------------------------------------------------
 * DOM Manipulations from here on
 * ------------------------------------------------------ */
var page_cat = window.location.toString().match(/(?:cat|type)=([0-9]{1,2})/);
var page_search = window.location.toString().match(/terms=(.*?)(?:\&|$)/);
var hash = location.hash;
var isLoading = false;
console.log(window.location);

// add CSS from external source for easier editing in the browser
$('head').append('<link rel="stylesheet" href="http://www.thekohrs.net/mal/tt/libdeluxe.css" type="text/css" />');

// Loader for ajax calls
$('#main').append('<div id="loader"></div>');

// Skeleton of the new interface
$('body>p.footer').before( 
	"<div id='header'>\
			<div class='searchfield'>\
				<form name='loginBox' action='search.php' method='get' accept-charset='utf-8'>\
					<input  id='type' type='text' name='type' style='display:none;' />\
					<input  id='search' type='text' name='terms' placeholder='Search' />\
					<input type='submit' style='position: absolute; left: -9999px; width: 1px; height: 1px;' />\
				</form>\
			</div>\
	</div>\
	<div id='wrapper'>\
		<section id='left_panel'>\
			<div class='nav'>\
				<ul class='cat'></ul>\
			</div>\
		</section>\
		<section id='libview'>\
			<div class='spacer'></div>\
		</section>\
		<section id='right_panel'>\
			<div class='nav'>\
				<ul class='hot'></ul>\
			</div>\
		</section>\
		<div class='clearfix'></div>\
	</div>\
	<div class='overlay' title='Close' style='display:none'>\
		<iframe id='website' src='' sandbox='allow-same-origin'></iframe>\
	</div>"
);

// Categories, easier to resort
$('div.nav>ul.cat').append(
	'<li class="cat_all"><a href="/?">All</a></li>\
	 <li class="cat_1"><a href="/?cat=1">Anime</a></li>\
	 <li class="cat_10"><a href="/?cat=10">Non-English</a></li>\
	 <li class="cat_7"><a href="/?cat=7">Raws</a></li>\
	 <li class="cat_3"><a href="/?cat=3">Manga</a></li>\
	 <li class="cat_8"><a href="/?cat=8">Drama</a></li>\
	 <li class="cat_2"><a href="/?cat=2">Music</a></li>\
	 <li class="cat_9"><a href="/?cat=9">M-Video</a></li>\
	 <li class="cat_11"><a href="/?cat=11">Batch</a></li>\
	 <li class="cat_4"><a href="/?cat=4">Hentai</a></li>\
	 <li class="cat_12"><a href="/?cat=12">H-Anime</a></li>\
	 <li class="cat_13"><a href="/?cat=13">H-Manga</a></li>\
	 <li class="cat_14"><a href="/?cat=14">H-Games</a></li>\
	 <li class="cat_15"><a href="/?cat=15">JAV</a></li>\
	 <li class="cat_5"><a href="/?cat=5">Other</a></li>'
);

// add page information to the new interface
if(page_cat) {
	$('.nav .cat_'+page_cat[1]).addClass('selected');
	$('#search').addClass('cat_'+page_cat[1]);
	$('#type').val(page_cat[1]);
} else {
	$('.nav .cat_all').addClass('selected');
}

if(page_search){
	$('#search').val(decodeURIComponent(page_search[1]).replace('+',' ').toLowerCase());
}

var libview = $('#libview'),
	MALdata = {};

// loading cached anime-data from localstorage
loadMALdata();

// loading settings from localstorage
// skip opening if nessesary
if(window.localStorage.getItem("skip_opening")){
	initInterface(false);
	$(document).ready(function() {
		console.log([hash, hash == true]);
		if(hash){
			ajaxLoadTT(hash.replace('#',''));
		} else {
			spawnTiles(getTTlist(document.body));
		}
	});
		
}
else {
	$(document).ready(function(){
		var ttlist = getTTlist(document.body);
		// fancy openings sequence
		var openingSequence = new TimelineLite({onComplete:initInterface, onCompleteParams:[ttlist]});
		openingSequence.append(TweenMax.to($('#main'),1,{width:1140}));
		openingSequence.append(TweenMax.to($('#main'),1,{opacity:0}));
		openingSequence.append(TweenMax.to($('body'),1,{'background-color':'#eee'}),-1);
	});
}


/* --------------------------------------------------------
 * Event Listeners
 * ------------------------------------------------------ */
// Scroll Event
$(window).scroll(scrollTiles);
$(window).resize(scrollTiles);
function scrollTiles() {
	var i = 0;
	$('#libview .waitForAnimation').each(function(){
		if(isOnScreen(this)){
			$(this).removeClass('waitForAnimation');
			TweenMax.from($(this),.5,{ delay: i *.2, opacity:0,	y:200});
			i++;
		}
	});
};

$('.nav a').bind('click',function(e){
	if(e.which==1){
		e.preventDefault();
		$('.cat>li').removeClass('selected');
		$(this).parent().addClass('selected');
		ajaxLoadTT($(this).attr('href'));
	}
});

// Search Button events
var searchLength=0;
$('#search').focus(function(){
	$(this).attr('placeholder','');
}).blur(function(){
	$(this).attr('placeholder','Search');
}).change(function(){
	console.log($(this).val());
}).keyup(function(e){
	var type,n; 
	if(searchLength===0 && e.which===8){
		$('#type').val('');
		$(this).attr('class','');
	} else {
		n = $(this).val().match(/ ?[@!#:]([a-z\-]*)$/i);
		if(!n) n = $(this).val().match(/ ?([a-z\-]*)[@!#:]{1}/i);
		if(n){
			switch(n[1].toUpperCase()){
				case 'ALL': 		type = 'all';	break;
				case 'ANIME':		type = 1; 	break;
				case 'NON-ENGLISH':type = 10;	break;	
				case 'RAWS':		type = 7;	break;	
				case 'MANGA':		type = 3;	break;	
				case 'DRAMA':		type = 8;	break;	
				case 'MUSIC':		type = 2;	break;	
				case 'MVIDEO':		type = 9;	break;	
				case 'BATCH':		type = 11;	break;	
				case 'HENTAI':		type = 4;	break;	
				case 'H-ANIME':		type = 12;	break;	
				case 'H-MANGA':		type = 13;	break;	
				case 'H-GAME':		type = 14;	break;	
				case 'JAV':			type = 15;	break;	
				case 'OTHER':		type = 5;	break;
			}
			if(type){
				$('#type').val(type);
				$(this).val($(this).val().replace(n[0],''));
				$(this).attr('class','');
				$(this).addClass('cat_'+type);
				$('.cat>li').removeClass('selected').parent().find('.cat_'+type).addClass('selected');
			}
		}
	}
	searchLength = $(this).val().length;
});
$('.searchfield>form').submit(function(e){
	console.log('Submitting: '+$(this).serialize());
	ajaxLoadTT('/search.php?'+$(this).serialize());
	return false;
});

$(window).keydown(function(e){
	//TODO: Catch some keys they shouldn't focus like ctrl, shift, space, etc.
	if(document.activeElement != $('#search')[0])
		$('#search')[0].focus();
});


// page change event
setInterval(function()
{
    if (location.hash != hash)
    {
        console.log("Changed from " + hash + " to " + location.hash);
        hash = location.hash;
        // set interface to current hash
        var load_cat = hash.match(/(?:cat|type)=([0-9]{1,2})/);
		var load_search = window.location.toString().match(/terms=(.*?)(?:\&|$)/);
		if(load_cat) {
			$('.cat>li').removeClass('selected');
			$('.cat .cat_'+load_cat[1]).addClass('selected');
			$('#search').attr('class','').addClass('cat_'+load_cat[1]);
			$('#type').val(load_cat[1]);
		} else {
			$('.cat>li').removeClass('selected');
			$('.nav .cat_all').addClass('selected');
		}
		if(load_search)
			$('#search').val(load_search[1]);
		// see if this is init by loader
        if(!isLoading)
        	ajaxLoadTT(hash.replace('#',''));
    }
}, 100);

$('#header h1').click(function(){window.location = 'index.php'});

function openInIframe(e){
	if(e.which==1){ 
		e.preventDefault();
		openIframe($(this).attr('href'));
	}
}


/* --------------------------------------------------------
 * Functions
 * ------------------------------------------------------ */
function isOnScreen(elem){
	var docViewTop = $(window).scrollTop();
	var docViewBottom = docViewTop + $(window).height();

	var elemTop = $(elem).offset().top;
	var elemBottom = elemTop + $(elem).height();
	// TODO: return overScreen, onScreen, underScreen
	return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

function initInterface(list){
	skipOpening(true);
	TweenMax.from($('#header'),1,{opacity:0});
	TweenMax.from($('#wrapper'),1,{opacity:0});
	$("body").addClass('init');
	$("#header")
		.append($("#main>h1"))
		.append($("#main>div.centertext"))
		.append($("#main>h3"))
		.append($(".searchfield"));
	
	$('.dcenter>a[href^="search.php?terms="]').each(function(){
		$("<li></li>").append(this).appendTo('div.nav>ul.hot');
	});

	if(list)
		spawnTiles(list);
}

function skipOpening(bool){
	window.localStorage.setItem("skip_opening", bool);
}

function spawnTiles(list){

	var time_ago="";
	var posCount = 0;


	for (var j = 0; j < list.length; j++) {
		var t = list[j];
		var a = new Anime(t.file);
		if(a.title) {
			var hashCode = a.title.hashCode();
			
			// Time break clearFix before Tiles
			var date = t.meta.date.match(/min|sec|[0-9]{1,2} [hdwy]|[0-9]{1,2} mo/)[0];
			if(date != time_ago){
				time_ago = date;
				if(date=="sec")			$(libview).append("<div class='time_ago'>~ Within this Minute ~</div>");
				else if(date=="min")	$(libview).append("<div class='time_ago'>~ Just Now ~</div>");
				else					$(libview).append("<div class='time_ago'>~ "+t.meta.date.replace('hr','hour').replace('Date: ',"")+" ~</div>");
				posCount = 0;
			}

			var tile = $(
			"<div class='tile "+t.category+"' data-name='"+hashCode+"'>\
				<a><img class='thumb' width='50' /></a>\
				<h2 class='title'>\
					<a href='"+t.link+"' title='"+a.filename+"'>"+a.title+"</a>\
				</h2>\
				<h3 class='group'>"+(a.group ? a.group : "[uknown group]")+"</h3>\
				<div class='comment'>"+t.meta.comment+"</div>\
				<div class='ribbon'></div>\
				<div class='meta'></div>\
			</div>");

			/* //TODO: make this extra column work
			$('.tile').prepend('
				<div class="leftcol">\
					<a class="magnet"><span class="sprite_magnet"></span></a>\
					<a class="website"><span class="sprite_web"></span></a>\
					<a class="details"><span class="sprite_details"></span></a>\
				</div>'
				);
			*/

			/**
			 * Conditional Stuff
			 */
			if(a.episode) 
				tile.find(".title>a").append(' <span class="ep">'+a.episode+'</span>');

			//.website-icon
			var links = $('<div>'+t.web+'</div>').find('a');
			if(links.length==2)
				tile.find('.group').append($(links[0]).attr('title','Website').html('<img style="position:relative;top:2px;left:2px;" width="13" src="data:image/gif;base64,R0lGODlhEAAQALMAAAAAAP///19vj9Ha7B1ChKezxr/I13mOrpGjuTRLY/v8/bCztf///wAAAAAAAAAAACH5BAEAAAwALAAAAAAQABAAAARUkMlJq704az0K+obUfUjBdIOiGEfhpmtbDEgiuK5R2MgiIIqETqUaDAQGxCABFBaICiNSmZghDgiCVpvALhAC2sJ4+H1mgzKCwRLYTOwyb0Ov2+8RADs=">'));
			
			// insert Contributor
			if(t.meta.submitter != "Anonymous")
				tile.find(".group").append(" <small title='Submitter'>("+t.meta.submitter+")</small>");
			
			if(t.meta.auth==1)
				tile.find(".group").addClass("auth_ok");
			else if(t.meta.auth==2)
				tile.find(".group").addClass("auth_bad");

			// add meta tags
			var metadiv = tile.find(".meta").append("<span class='size'>"+t.meta.size+"</span>");

			if(a.extras_unsafe.length>0)
				metadiv.append("<span class='extra_unsafe'>"+a.extras_unsafe.join("</span><span class='extra_unsafe'>")+"</span>");

			if(a.extras.length>0)
				metadiv.append("<span class='extra'>"+a.extras.join("</span><span class='extra'>")+"</span>");
			
			if(a.resolution.length>0){
				//var res = a.resolution[0].replace(/^[0-9]{3,4}X([0-9]{3,4})/i,"$1P");		// trim those long definitions
				metadiv.append("<span class='resolution'>"+a.resolution[0]+"</span>");
			}
			if(a.videoType.length>0)
				metadiv.append("<span class='video'>"+a.videoType.join("</span><span class='video'>")+"</span>");
			
			if(a.audioType.length>0)
				metadiv.append("<span class='audio'>"+a.audioType.join("</span><span class='audio'>")+"</span>");
			
			if(a.version != undefined)
				tile.find('.ribbon').append("<div class='version'>"+a.version+"</div>");

			// open Nyaa tracker in iframe
			if(t.link.indexOf('nyaa.eu/')>-1){
				$('.title>a',tile).bind('click',openInIframe);
			}

			//clearfix
			$(tile).append("<div class='clearfix'></div>");
				//.append('<div class="file">'+a.filename+'</div>');

			tile.addClass('col_'+posCount%2);
			posCount++;

			// append to libview
			$(libview).append(tile);

			if(isOnScreen($('.tile:last',libview))){
				TweenMax.from(tile,.5,{	delay:j*.2 + 1, opacity:0, y:200});
			} else {
				tile.addClass('waitForAnimation');
			}

			if(!MALdata[hashCode]){
				MALdata[hashCode] = "loading!";
				searchMalData(a,function(result){
					if(result == "no result!") {
						// well fuck...
						return;
					} else {
						MALdata[result.hashCode] = result.data;
						saveMALdata();
						$(".tile[data-name="+result.hashCode+"] .thumb")
							.attr('src',result.data.image_url)
							.parent() // <a> container
							.attr('href','http://myanimelist.net/anime/'+result.data.id)
							.bind('click',openInIframe);
					}
				});
			} else if(MALdata[hashCode] === "loading!"){
				//console.log('waiting for loading...');
			} else if(MALdata[hashCode] === "no result!"){
				// well fuck... Maybe later on we'll try something new
			} else {
				$(".thumb",tile)
					.attr('src', MALdata[hashCode].image_url)
					.parent()
					.attr('href','http://myanimelist.net/anime/'+MALdata[hashCode].id)
					.bind('click',openInIframe);
			}
		}
	};
}

/* --------------------------------------------------------
 * Getting the TokyoTosho list of the current page
 * ------------------------------------------------------ */
function getTTlist(from){	// 'from': prepared for ajax requests
	var ttlist = [];
	$('.listing tr',from).each(function(){
		var top = $(this).find('.desc-top'),
			bot = $(this).find('.desc-bot'),
			web = $(this).find('.web'),
			sts = $(this).find('.stats');
		
		if(top.length > 0){
			top.find('.s').remove();
			var ttItem = {
				file 		: top.find('a:last').html(),
				link 		: top.find('a:last').attr("href"),
				web 		: web.html(),
				category 	: $(this).attr('class').replace("shade","").replace(" ","").replace('category_','cat_')
			};
			ttlist.push(ttItem);
		} 
		else if(bot.length > 0){
			ttlist[ttlist.length-1].meta = ttmetaParse(bot.html());
			ttlist[ttlist.length-1].stats = sts.html();
		}
	});
	return ttlist;
}

function ttmetaParse(meta){
	var a = meta.split(" | Comment: ");
	var b = a[0].split(" | ");
	var c,d,e;
	//console.log(b);
	var metadata = {
		"auth":0,
		"comment":a[1]?a[1]:"",
		"submitter":"",
		"size":"0kb",
		"date":""
	};

	for (var i = 0; i < b.length; i++) {
		if(b[i].match(/Authorized:.*?auth_ok/)) {
			metadata.auth = 1;
		}
		if(b[i].match(/Authorized:.*?auth_bad/)) {
			metadata.auth = 2;
		}
		if(b[i].match(/Submitter:/)) {
			metadata.submitter = b[i].split(/ ?Submitter: /)[1];

		} else if(b[i].indexOf('Size:') > -1){
			metadata.size = b[i].replace("Size: ", "");

		} else if(b[i].indexOf('ago') > -1) {
			metadata.date = b[i];
		} else {
			c = b[i].split(' ');
			d = c[2].split(':');
			c = c[1].split('-');
			e = Date.UTC(c[0],c[1]-1,c[2],d[0],d[1]);
			var now = new Date();
			d = now-e;
			if(Math.floor(d/(24 * 60 * 60 * 1000)) > 1) {							//days
				metadata.date = Math.floor(d/(24 * 60 * 60 * 1000)) + " days ago";
			} else if(Math.floor(d/(24 * 60 * 60 * 1000)) > 0) {					//day
				metadata.date = "1 day ago";
			} else if(Math.floor(d/(60 * 60 * 1000)) > 1) {							//hours
				metadata.date = Math.floor(d/(60 * 60 * 1000)) + " hours ago";
			} else if(Math.floor(d/(60 * 60 * 1000)) > 0) {							//hour
				metadata.date = "1 hour ago";
			} else if(Math.floor(d/(60 * 1000)) > 0) {								// minutes
				metadata.date = "some min ago";
			} else {
				metadata.date = "some sec ago";
			}
		}
	};
	return metadata;
}

function ajaxLoadTT(url){
	console.log(url);
	$('#libview').empty().append('<span class="loading msg">Loading Content...</span>');
	isLoading = true;
	window.location = '#'+url;
	$('#loader').empty().load(url + " .listing",function(){
		isLoading = false;
		$('#libview .loading').remove();
		var loaded_list = getTTlist($('#loader'));
		if(loaded_list.length > 0){
			spawnTiles(loaded_list);
		} else {
			$('#libview').append('<span class="error msg">Nothing found!</span>');
		}
	});
}


/* --------------------------------------------------------
 * Getting Data from the MAL DB for giggles and funzies
 * ------------------------------------------------------ */

function searchMalData(anime,cb){
	var result={};
	result.hashCode = anime.cleanTitle.hashCode();
	result.anime = anime;
	// filter illegal search terms
	var query = anime.cleanTitle;
	$.getJSON('http://mal-api.com/anime/search?q='+query, function(data) {
		
		if(data.length > 1) { // more than one match
			var distance = 100;
			// finding the closest match
			for (var i = data.length - 1; i >= 0; i--) { 
				var levDis = anime.title.distanceTo(data[i].title);
				if(levDis < distance){
					distance = levDis;
					result.data = data[i];
				}
			}
		} else if(data.length==1) { // only one match
			result.data = data[0];
		} else { // no matches
			result.data = "no result!";
			cb(result);
			return;
		}
		
		// bigger thumbnail images
		console.log(result.data);
		result.data.image_url = result.data.image_url.replace(/t(\.[jpg|png|gif]{3})$/i, "$1");
		cb(result);
	});
}

function openIframe(url){
	$('.overlay').show();
	$('.overlay>#website').attr('src',url);
	$('.overlay').click(function(){$(this).hide();});
}

function saveMALdata(){
	if(MALdata.length>200){

	}
	window.localStorage.setItem("MALdata", JSON.stringify(MALdata));
}

function loadMALdata(){
	var coll = window.localStorage.getItem("MALdata");
	if(coll) MALdata = JSON.parse(coll);
	return (coll?true:false);
}