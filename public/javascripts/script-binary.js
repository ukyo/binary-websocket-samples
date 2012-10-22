window.onload = function() {

  function serialize(line) {
    var buff = new ArrayBuffer(12);
    var view = new DataView(buff);
    //set line color
    view.setUint8(0, line.color[0]);
    view.setUint8(1, line.color[1]);
    view.setUint8(2, line.color[2]);
    //set start point
    view.setUint16(3, line.start[0], true);
    view.setUint16(5, line.start[1], true);
    //set end point
    view.setUint16(7, line.end[0], true);
    view.setUint16(9, line.end[1], true);
    //set line width
    view.setUint8(11, line.width);
    return buff;
  }

  function deserialize(buff, offset) {
    var view = new DataView(buff, offset);
    return {
      color: [
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2)
      ],
      start: [
        view.getUint16(3, true),
        view.getUint16(5, true)
      ],
      end: [
        view.getUint16(7, true),
        view.getUint16(9, true)
      ],
      width: view.getUint8(11)
    };
  }

  function sendMessage(line) {
    socket.send(serialize(line));
  }

  var paper = Paper(sendMessage);
  var socket = new WebSocket('ws://' + location.host);
  
  socket.binaryType = 'arraybuffer';
  socket.onmessage = function(message) {
    var buff = message.data;
    for(var offset = 0, n = buff.byteLength; offset < n; offset += 12)
      paper.drawLine(deserialize(buff, offset));
  };
};