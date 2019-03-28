var socket = io(BASEURL);

$(function(){
    
  $(document).on('click', function(){
    $.ajax({
      type: "POST",
      url: BASEURL+'/newmail',
      data: {
        body_plain_fake: 'hi, i am a mail',
        subject: 'yo'
      }
    });
  });
      
  socket.emit('connectedId', {place: place});
  
  socket.on('ping', function(data){
    console.log(place);
    socket.emit('pong', {beat: 1, place: place});
  });
  
  socket.on('refresh', function(){
    console.log('refresh');
    location.reload();
  });
    
  socket.on('stats/to/client', function(data){
    console.log('stats');
    
    console.dir(data, { depth: null} );

    for(var place in data.stats.places) {
      
      /*
      for (var mood in data.stats.places[place].moods) {
        console.log(mood);
        console.log(data.stats.places[place].moods[mood]);
      }
      */
      
      console.dir('TOP of place '+place+' : '+data.stats.places[place].topMood.mood+' ('+data.stats.places[place].topMood.nb+')');
    }
    
    console.dir('MOY : '+data.stats.moyMood.mood+' ('+data.stats.moyMood.nb+')');
    
    var topMoodItem = $('.mood[data-value="'+data.stats.moyMood.mood+'"]')
    
    var secondMood = $('.mood:eq(1)');
    
    switch(topMoodItem.index()) {
      case 0:
        topMoodItem.insertAfter($('.mood:eq(2)'));
      case 1:
        $('.mood').last().prependTo($('.aligner'));
      case 3:
        topMoodItem.insertAfter($('.mood:eq(1)'));
      case 4:
        topMoodItem.insertAfter($('.mood:eq(1)'));
    }
    
        
    $('.mood.top').removeClass('top');
    topMoodItem.addClass('top');
    
    $('[data-reactive-container-of="topmood"]').text(data.stats.moyMood.mood);
        
    $('.reactive-zone').load('/place/'+place+' .cols');

  });
    
    
  socket.on('newmail/to/client', function(data){
    console.log('NEW MAIL!');
    console.log(data);
  });
    
    
  
  
  $('.mood').on('click', function(){    
    console.log('mood clicked');
    
    $('body').css('background', $(this).data('color'));
    
    $('.mood.active').removeClass('active');
    $(this).addClass('active');
    
    socket.emit('mood/to/server', {
      place: place,
      mood: $(this).data('value')
    });
  });
  
  $('[data-refresh]').on('click', function(){
    socket.emit('refresh', null);
  });
});