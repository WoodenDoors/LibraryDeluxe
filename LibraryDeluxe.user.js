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
 * Helpful functions
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



/* --------------------------------------------------------
 * Getting the TokyoTosho list of the current page
 * ------------------------------------------------------ */
function getTTlist(from){	// prepared for ajax requests
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
// some adress bar magic for myself
if(~window.location.toString().indexOf("#noStyle")){
	//console.log(a);
	//console.log(ttlist);
	throw(new Error('#noStyle Called!'));
}



$('head').append('<link rel="stylesheet" href="http://www.thekohrs.net/mal/tt/libdeluxe.css" type="text/css" />');

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
		<section id='libview'></section>\
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


var libview = $('#libview');
var collection = {};
loadCollection();

if(window.localStorage.getItem("skip_opening")){
	initInterface(false);
	$(document).ready(function() {
		spawnTiles(getTTlist(document.body));
	});
}
else {

	$(document).ready(function(){
		var ttlist = getTTlist(document.body);
		var openingSequence = new TimelineLite({onComplete:initInterface, onCompleteParams:[ttlist]});
		openingSequence.append(TweenMax.to($('#main'),1,{width:1140}));
		openingSequence.append(TweenMax.to($('#main'),1,{opacity:0}));
		openingSequence.append(TweenMax.to($('body'),1,{'background-color':'#eee'}),-1);
	});
}


/*
 * Eventlisteners
 */
$(window).scroll(function () {
	var i = 0;
	$('#libview .waitForAnimation').each(function(){
		if(isOnScreen(this)){
			$(this).removeClass('waitForAnimation');
			TweenMax.from($(this),.5,{ 
								delay: i *.2,
								opacity:0, 
								//rotation:(posCount%2>0? -30: 30),
								//x:(posCount%2>0? 50: -50),
								y:200
		});
		i++;
		}
	});
});
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
	} else if(n= $(this).val().match(/ ?[@!#](\w*)$/i)){
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
		}
	}
	searchLength = $(this).val().length;
});
$('.searchfield>form').submit(function(e){
	console.log('Submitting: '+$(this).serialize());
	//return false;
});

/**
 * Functions
 */

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
				<img class='thumb' width='50' />\
				<h2 class='title'>\
					<a href='"+t.link+"' title='"+a.filename+"'>"+a.title+"</a>\
				</h2>\
				<h3 class='group'>"+(a.group ? a.group : "[uknown group]")+"</h3>\
				<div class='comment'>"+t.meta.comment+"</div>\
				<div class='ribbon'></div>\
				<div class='meta'></div>\
			</div>");


			// insert optional stuff if they are available
			if(a.episode) 
				tile.find(".title>a").append(' <span class="ep">'+a.episode+'</span>');

			// insert Contributor
			if(t.meta.submitter != "Anonymous")
				tile.find(".group").append(" <small title='Submitter'>("+t.meta.submitter+")</small>");
			
			if(t.meta.auth==1)
				tile.find(".group").addClass("auth_ok");
			else if(t.meta.auth==2)
				tile.find(".group").addClass("auth_bad");

			// add meta tags
			tile.find(".meta").append("<span class='size'>"+t.meta.size+"</span>");

			if(a.extras_unsafe.length>0)
				tile.find('.meta').append("<span class='extra_unsafe'>"+a.extras_unsafe.join("</span><span class='extra_unsafe'>")+"</span>");

			if(a.extras.length>0)
				tile.find('.meta').append("<span class='extra'>"+a.extras.join("</span><span class='extra'>")+"</span>");
			
			if(a.resolution.length>0){
				var res = a.resolution[0].replace(/^[0-9]{3,4}X([0-9]{3,4})/i,"$1P");		// trim those long definitions
				tile.find('.meta').append("<span class='resolution'>"+res+"</span>");
			}
			if(a.videoType.length>0)
				tile.find('.meta').append("<span class='video'>"+a.videoType.join("</span><span class='video'>")+"</span>");
			
			if(a.audioType.length>0)
				tile.find('.meta').append("<span class='audio'>"+a.audioType.join("</span><span class='audio'>")+"</span>");
			
			if(a.version != undefined)
				tile.find('.ribbon').append("<div class='version'>"+a.version+"</div>");


			// open Nyaa tracker in iframe
			if(t.link.indexOf('nyaa.eu/')>-1){
				$('.title>a',tile).bind('click',function(e){
					if(e.which==1){ 
						e.preventDefault();
						openIframe($(this).attr('href'));
					}
				});
			}

			//clearfix
			$(tile).append("<div class='clearfix'></div>");
				//.append('<div class="file">'+a.filename+'</div>');

			tile.addClass('col_'+posCount%2);
			posCount++;

			// append to libview
			$(libview).append(tile);


			if(isOnScreen($('.tile:last',libview))){
			TweenMax.from(tile,.5,{	delay:j*.2 + 1, 
									opacity:0, 
									//rotation:(posCount%2>0? -30: 30),
									//x:(posCount%2>0? 50: -50),
									y:200
			});
			} else {
				tile.addClass('waitForAnimation');
			}




			if(!collection[hashCode]){
				collection[hashCode] = "loading!";
				searchMalData(a,function(result){
					if(result == "no result!") {
						// well fuck...
						return;
					} else {
						collection[result.hashCode] = result.data;
						saveCollection();
						$(".tile[data-name="+result.hashCode+"] .thumb").attr('src',result.data.image_url);
					}
				});
			} else if(collection[hashCode] === "loading!"){
				//console.log('waiting for loading...');
			} else if(collection[hashCode] === "no result!"){
				// well fuck... Maybe later on we'll try something new
			} else {
				$(".thumb",tile).attr('src', collection[hashCode].image_url);
			}
		}
	};
}

function ttmetaParse(meta){
	var a = meta.split(" | Comment: ");
	var b = a[0].split(" | ");
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
		}
	};
	return metadata;
}


/* --------------------------------------------------------
 * Getting Data from the MAL DB for giggles and funzies
 * ------------------------------------------------------ */

function searchMalData(anime,cb){
	var result={};
	result.hashCode = anime.title.hashCode();
	result.anime = anime;
	//collection[hashCode] = "loading!";
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

function saveCollection(){
	window.localStorage.setItem("collection", JSON.stringify(collection));
}

function loadCollection(){
	var coll = window.localStorage.getItem("collection");
	if(coll) collection = JSON.parse(coll);
	return (coll?true:false);
}