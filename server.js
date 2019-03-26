var CONFIG            = require('./config.js');

var path              = require('path');
var express           = require('express')();

var server            = require('http').Server(express);
var io                = require('socket.io')(server);
var serveStatic       = require('serve-static');
var fs                = require("fs");
var bodyParser        = require('body-parser');
var url               = require('url');

let Parser            = require('rss-parser');
let parser            = new Parser();

var JsonDB            = require('node-json-db');
var db = new JsonDB("app/db/trait-union", true, true);


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
      db.push("/"+date+"", { floors : [] }, true);    
    }
    
    try {
      if (db.getData("/"+date+"/floors["+data.floor+"]") == null) {
        db.push("/"+date+"/floors["+data.floor+"]", { moods : [] }, true);
      }
    } catch(error) {}
    
    
    
    db.push("/"+date+"/floors["+data.floor+"]/moods[]", {
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
    console.log("[PING] Floor "+data.floor+" is still connected");
  });
  
  var heartBeat = setTimeout(sendHeartbeat, CONFIG.site.socketPingTimeout);
});



/////////




express.use(function(req,res,next){
  req.io = io;
  next();
})

express.use( serveStatic( __dirname + '/app/' ) );
express.use( bodyParser.urlencoded({
  extended: true
}));

express.set( 'view engine', 'ejs' );

express.get('/floor/:floor/', function (req, res) {  
   
  var floor = req.params.floor;
  
  var stats = fetchFreshData();
  
  res.render( __dirname + '/app/views/floor', {
    BASEURL             : CONFIG.site.baseURL,
    floor               : floor,
    stats               : stats
  });
});

express.get('/actus/', function (req, res) {  

  parser.parseURL('https://met.grandlyon.com/feed/', function(err, feed) {
    console.log(feed.title);
   
    feed.items.forEach(item => {
      console.log(item.title + ' : ' + item.link)
    });
    
    res.render( __dirname + '/app/views/actus', {
      BASEURL             : CONFIG.site.baseURL,
      actus : feed.items
    });
  });
  
});
	
express.post('/newmail', function (req, res) { 
  console.log('New mail');
  
  console.log(req.body);
   
  req.io.sockets.emit('newmail/to/client',{coucou:'hey'});
  
  res.sendStatus(200);
});





server.listen(CONFIG.site.port, function(){
  console.log('Listening on *:'+CONFIG.site.port);
});

/////////


function fetchFreshData() {
  
    var date = getDateSlug();
  	//////////////////////
    //
    //  Fetch fresh data
    
    var statsByFloor = {floors: [], moods: {}, moyMood: { mood: null, nb: 0 }};
    
    try {
      var isAnythingToday = db.getData("/"+date+"");
    } catch (error) {
      db.push("/"+date+"", { floors : [] }, true);    
    }
    
    
    var moodsOfFloorsOfToday = db.getData("/"+date);
    
    for (var floorIndex = 0; floorIndex < moodsOfFloorsOfToday.floors.length; floorIndex++) {
      // In each floor of the day
      // console.log(floorIndex);
      
    //  statsByFloor.push({floorIndex: {}});
  
        statsByFloor.floors[floorIndex] = { moods: {}, topMood: { mood: null, nb: 0 } };
      
      if (moodsOfFloorsOfToday.floors[floorIndex] != null) {
        
        for (var moodIndex = 0; moodIndex < moodsOfFloorsOfToday.floors[floorIndex].moods.length; moodIndex++) {
          // In each mood of the floor of the day
          // console.log(moodsOfFloorsOfToday.floors[floorIndex].moods[moodIndex].mood);
          
          var mood = moodsOfFloorsOfToday.floors[floorIndex].moods[moodIndex].mood;
          
          if (!statsByFloor.floors[floorIndex].moods.hasOwnProperty(mood)) {
            statsByFloor.floors[floorIndex].moods[mood] = 1;
          } else {
            statsByFloor.floors[floorIndex].moods[mood]++;
          }
          
          if (!statsByFloor.moods.hasOwnProperty(mood)) {
            statsByFloor.moods[mood] = 1;
          } else {
            statsByFloor.moods[mood]++;
          }
        }
        
        /////////////
        //
        // topMood
        
        for (var mood in statsByFloor.floors[floorIndex].moods) {
          // If there is more mood occurences here, let's define the top
          
          if (statsByFloor.floors[floorIndex].moods[mood] >= statsByFloor.floors[floorIndex].topMood.nb) {            
            statsByFloor.floors[floorIndex].topMood.mood = mood;
            statsByFloor.floors[floorIndex].topMood.nb = statsByFloor.floors[floorIndex].moods[mood];
          }
        }
        
      }
    }
    
    /////////////
    //
    // moyMood
    
    for (var mood in statsByFloor.moods) {
      if (statsByFloor.moods[mood] >= statsByFloor.moyMood.nb) {            
        statsByFloor.moyMood.mood = mood;
        statsByFloor.moyMood.nb = statsByFloor.moods[mood];
      }
    }
    
    /*
      
      // topMood for all floor (which floor has the highest nb?)
      
      for (var floorIndex in statsByFloor.floors) {
      if (statsByFloor.floors[floorIndex].topMood.nb >= statsByFloor.moyMood.nb) {            
        statsByFloor.moyMood.mood = statsByFloor.floors[floorIndex].topMood.mood;
        statsByFloor.moyMood.nb = statsByFloor.floors[floorIndex].topMood.nb;
      }
    }
    */
    
    console.dir(statsByFloor, { depth: null} );
    
    return statsByFloor;
	}
	

function getDateSlug(timestamp, returnAsArray = false) {
  if (!timestamp) timestamp = new Date();
  
  var date = new Date(timestamp).toLocaleDateString("fr-FR");
  
  if (returnAsArray)
    return date.split('-');
  else
    return date;
}