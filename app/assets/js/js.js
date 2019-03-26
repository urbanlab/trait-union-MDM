var socket = io(BASEURL);

$(function(){
    
      
  socket.emit('connectedId', {floor: floor});
  
  socket.on('ping', function(data){
    console.log(floor);
    socket.emit('pong', {beat: 1, floor: floor});
  });
  
  socket.on('refresh', function(){
    console.log('refresh');
    location.reload();
  });
    
  socket.on('stats/to/client', function(data){
    console.log('stats');
    
    console.dir(data, { depth: null} );

    for(var floor in data.stats.floors) {
      
      /*
      for (var mood in data.stats.floors[floor].moods) {
        console.log(mood);
        console.log(data.stats.floors[floor].moods[mood]);
      }
      */
      
      console.dir('TOP of floor '+floor+' : '+data.stats.floors[floor].topMood.mood+' ('+data.stats.floors[floor].topMood.nb+')');
    }
    
    console.dir('MOY : '+data.stats.moyMood.mood+' ('+data.stats.moyMood.nb+')');
        
    $('.reactive-zone').load('/floor/'+floor+' .cols');

  });
    
    
  socket.on('newmail/to/client', function(data){
    console.log('NEW MAIL!');
  });
    

  $('.actus').load('/actus');

  setInterval(function(){  
    $('.actus').load('/actus');
  }, 120000);
    
  
  
  $('.mood').on('click', function(){    
    console.log('mood clicked');
    
    socket.emit('mood/to/server', {
      floor: floor,
      mood: $(this).data('value')
    });
  });
  
  $('[data-refresh]').on('click', function(){
    socket.emit('refresh', null);
  });
});