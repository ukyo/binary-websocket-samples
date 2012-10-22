window.onload = function() {

  function sendMessage(line) {
    socket.send(JSON.stringify(line));
  }

  var paper = Paper(sendMessage);
  var socket = new WebSocket('ws://' + location.host);

  socket.onmessage = function(message) {
    var lines = JSON.parse(message.data);
    
    if(!Array.isArray(lines)) {
      paper.drawLine(lines);
      return;
    }

    for(var i = 0, n = lines.length; i < n; ++i)
      paper.drawLine(lines[i]);
  };
};