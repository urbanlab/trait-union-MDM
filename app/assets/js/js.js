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
        
    $('.reactive-zone').load('/floor/'+floor+' .cols');

  });
    
    
  socket.on('newmail/to/client', function(data){
    console.log('NEW MAIL!');
  });
    
    
  
  
  $('.mood').on('click', function(){    
    console.log('mood clicked');
    
    $('body').css('background', $(this).data('color'));
    
    $('.mood.active').removeClass('active');
    $(this).addClass('active');
    
    socket.emit('mood/to/server', {
      floor: floor,
      mood: $(this).data('value')
    });
  });
  
  $('[data-refresh]').on('click', function(){
    socket.emit('refresh', null);
  });
});