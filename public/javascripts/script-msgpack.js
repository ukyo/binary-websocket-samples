window.onload = function() {
  
  function sendMessage (line) {
    socket.send(new Uint8Array(msgpack.pack(line)).buffer);
  }

  var paper = Paper(sendMessage);
  var socket = new WebSocket('ws://' + location.host);
  
  socket.binaryType = 'arraybuffer';
  socket.onmessage = function(message) {
    console.log(message.data.byteLength);
    var lines = msgpack.unpack(new Uint8Array(message.data));

    if(!Array.isArray(lines)) {
      paper.drawLine(lines);
      return;
    }

    for(var i = 0, n = lines.length; i < n; ++i)
      paper.drawLine(lines[i]);
  };
};