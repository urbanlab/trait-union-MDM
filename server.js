var CONFIG            = require('./config.js');

var path              = require('path');

/*
var express           = require('express')();
var server            = require('http').Server(express);
var io                = require('socket.io')(server);
*/

var app               = require('express')();
var http              = require('http').Server(app);
var io                = require('socket.io')(http);

var serveStatic       = require('serve-static');
var fs                = require("fs");
var bodyParser        = require('body-parser');
var url               = require('url');

let Parser            = require('rss-parser');
let parser            = new Parser();

var JsonDB            = require('node-json-db');
var db = new JsonDB("app/db/trait-union", true, true);





var places = [
  'Lyon 1',
  'Lyon 2',
  'Lyon 3',
  'Lyon 4',
  'Lyon 5',
  'Lyon 6',
  'Lyon 7',
  'Lyon 8',
  'Lyon 9',
];


/////////////////////////

io.on('connection', function(socket){
  console.log('New client is connected');
	
	socket.on('newmail/to/server', function(data) {  
  	  console.log('NEW MAIL');
  	  console.log(data);
  });
	
	socket.on('mood/to/server', function(data) {  
    
  //  console.log(getDateSlug());
  
    var date = getDateSlug();
    
    try {
      var isAnythingToday = db.getData("/"+date+"");
    } catch (error) {
      db.push("/"+date+"", { places : [] }, true);    
    }
    
    try {
      if (db.getData("/"+date+"/places["+data.place+"]") == null) {
        db.push("/"+date+"/places["+data.place+"]", { moods : [] }, true);
      }
    } catch(error) {}
    
    
    
    db.push("/"+date+"/places["+data.place+"]/moods[]", {
      mood: data.mood
    }, true);
    
    var stats = fetchFreshData();
    
    var dataToClient = {};
    dataToClient.stats = stats;
      
    io.sockets.emit('stats/to/client',dataToClient);
	});
	
	socket.on('refresh', function(data) {   
  	  console.log('refresh'); 
    io.sockets.emit('refresh',null);
	});
  
  socket.on('disconnect', function(){
    clearTimeout(heartBeat);
  });
  
  function sendHeartbeat(){
    heartBeat = setTimeout(sendHeartbeat, CONFIG.site.socketPingTimeout);
    io.sockets.emit('ping', { beat : 1 });
  }
  
  socket.on('pong', function(data){
    console.log("[PING] Place "+data.place+" is still connected");
  });
  
  var heartBeat = setTimeout(sendHeartbeat, CONFIG.site.socketPingTimeout);
});



/////////




app.use(function(req,res,next){
  req.io = io;
  next();
})

app.use( serveStatic( __dirname + '/app/' ) );
app.use( bodyParser.urlencoded({
  extended: true
}));

app.set( 'view engine', 'ejs' );

app.get('/place/:place/', function (req, res) {  
   
  var place = req.params.place;
  
  var stats = fetchFreshData();
  
  res.render( __dirname + '/app/views/place', {
    BASEURL             : CONFIG.site.baseURL,
    place               : place,
    stats               : stats,
    places              : places
  });
});

app.get('/places', function (req, res) {  
  
  res.render( __dirname + '/app/views/places', {
    BASEURL             : CONFIG.site.baseURL,
    places              : places
  });
});
	
app.post('/newmail', function (req, res) { 
  console.log('New mail!');
//  console.log(req.body);
  
  db.push("/mails[]", { 
    subject   : req.body.subject,
    body      : req.body.body_plain,
    from_name : req.body.from__name,
    from_mail : req.body.from__email
  }, true);    
  
  var mailMessages = db.getData("/mails");
   
  req.io.sockets.emit('newmail/to/client',{ mails: mailMessages });
  
  res.sendStatus(200);
});

app.get('/mails', function (req, res) { 
  
  try {
    if (db.getData("/mails") == null) {
      db.push("/mails", [], true);
    }
    var mailMessages = db.getData("/mails");
  } catch(error) {
    var mailMessages = db.getData("/mails");
  } 
  
  console.log('GET /mails : get emails from db:');
  console.log(mailMessages);
  console.log('/end db');
  
  res.render( __dirname + '/app/views/mails', {
    BASEURL             : CONFIG.site.baseURL,
    mails               : mailMessages
  });  
});



http.listen(CONFIG.site.port, function(){
  console.log('Listening on *:'+CONFIG.site.port);
});

/////////


function fetchFreshData() {
  
    var date = getDateSlug();
  	//////////////////////
    //
    //  Fetch fresh data
    
    var statsByPlace = {places: [], moods: {}, moyMood: { mood: null, nb: 0 }};
    
    try {
      var isAnythingToday = db.getData("/"+date+"");
    } catch (error) {
      db.push("/"+date+"", { places : [] }, true);    
    }
    
    
    var moodsOfPlacesOfToday = db.getData("/"+date);
    
    for (var placeIndex = 0; placeIndex < moodsOfPlacesOfToday.places.length; placeIndex++) {
      // In each place of the day
      // console.log(placeIndex);
      
    //  statsByPlace.push({placeIndex: {}});
  
        statsByPlace.places[placeIndex] = { moods: {}, topMood: { mood: null, nb: 0 } };
      
      if (moodsOfPlacesOfToday.places[placeIndex] != null) {
        
        for (var moodIndex = 0; moodIndex < moodsOfPlacesOfToday.places[placeIndex].moods.length; moodIndex++) {
          // In each mood of the place of the day
          // console.log(moodsOfPlacesOfToday.places[placeIndex].moods[moodIndex].mood);
          
          var mood = moodsOfPlacesOfToday.places[placeIndex].moods[moodIndex].mood;
          
          if (!statsByPlace.places[placeIndex].moods.hasOwnProperty(mood)) {
            statsByPlace.places[placeIndex].moods[mood] = 1;
          } else {
            statsByPlace.places[placeIndex].moods[mood]++;
          }
          
          if (!statsByPlace.moods.hasOwnProperty(mood)) {
            statsByPlace.moods[mood] = 1;
          } else {
            statsByPlace.moods[mood]++;
          }
        }
        
        /////////////
        //
        // topMood
        
        for (var mood in statsByPlace.places[placeIndex].moods) {
          // If there is more mood occurences here, let's define the top
          
          if (statsByPlace.places[placeIndex].moods[mood] >= statsByPlace.places[placeIndex].topMood.nb) {            
            statsByPlace.places[placeIndex].topMood.mood = mood;
            statsByPlace.places[placeIndex].topMood.nb = statsByPlace.places[placeIndex].moods[mood];
          }
        }
        
      }
    }
    
    /////////////
    //
    // moyMood
    
    for (var mood in statsByPlace.moods) {
      if (statsByPlace.moods[mood] >= statsByPlace.moyMood.nb) {            
        statsByPlace.moyMood.mood = mood;
        statsByPlace.moyMood.nb = statsByPlace.moods[mood];
      }
    }
    
    /*
      
      // topMood for all place (which place has the highest nb?)
      
      for (var placeIndex in statsByPlace.places) {
      if (statsByPlace.places[placeIndex].topMood.nb >= statsByPlace.moyMood.nb) {            
        statsByPlace.moyMood.mood = statsByPlace.places[placeIndex].topMood.mood;
        statsByPlace.moyMood.nb = statsByPlace.places[placeIndex].topMood.nb;
      }
    }
    */
    
    console.dir(statsByPlace, { depth: null} );
    
    return statsByPlace;
	}
	

function getDateSlug(timestamp, returnAsArray = false) {
  if (!timestamp) timestamp = new Date();
  
  var date = new Date(timestamp).toLocaleDateString("fr-FR");
  
  if (returnAsArray)
    return date.split('-');
  else
    return date;
}