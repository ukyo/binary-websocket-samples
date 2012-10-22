window.onload = function() {
  var canvas = document.querySelector('canvas');
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  var ctx = canvas.getContext('2d');

  var startX, startY, endX, endY, lineColor = [0, 0, 0], lineWidth = 1;

  var lineColorInput = document.querySelector('#line-color');
  var lineWidthInput = document.querySelector('#line-width');

  lineColorInput.onchange = function() {
    lineColor = lineColorInput.value.slice(1).match(/../g).map(function(hex) {
      return parseInt(hex, 16);
    });
    console.log(lineColor);
  };

  lineWidthInput.onchange = function() {
    lineWidth = +lineWidthInput.value;
  };

  canvas.onmousedown = function(e) {
    e.preventDefault();
    canvas.dataset.isMouseDown = true;
    startX = e.offsetX;
    startY = e.offsetY;
  };

  canvas.onmouseup = function() {
    delete canvas.dataset.isMouseDown;
  };

  canvas.onmousemove = function(e) {
    if(!canvas.dataset.isMouseDown) return;
    
    endX = e.offsetX;
    endY = e.offsetY;

    var line = {
      c: lineColor,
      s: [startX, startY],
      e: [endX, endY],
      w: lineWidth
    };

    drawLine(line);
    socket.send(serialize(line));

    startX = endX;
    startY = endY;
  };

  function drawLine(line) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgb(' + line.c.join(',') + ')';
    ctx.lineCap = 'round';
    ctx.lineWidth = line.w;
    ctx.moveTo.apply(ctx, line.s);
    ctx.lineTo.apply(ctx, line.e);
    ctx.stroke();
    ctx.closePath();
  }

  function serialize(line) {
    var buff = new ArrayBuffer(12);
    var view = new DataView(buff);
    //set line color
    view.setUint8(0, line.c[0]);
    view.setUint8(1, line.c[1]);
    view.setUint8(2, line.c[2]);
    //set start point
    view.setUint16(3, line.s[0], true);
    view.setUint16(5, line.s[1], true);
    //set end point
    view.setUint16(7, line.e[0], true);
    view.setUint16(9, line.e[1], true);
    //set line width
    view.setUint8(11, line.w);
    return buff;
  }

  function deserialize(buff, offset) {
    var view = new DataView(buff, offset);

    return {
      c: [
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2)
      ],
      s: [
        view.getUint16(3, true),
        view.getUint16(5, true)
      ],
      e: [
        view.getUint16(7, true),
        view.getUint16(9, true)
      ],
      w: view.getUint8(11)
    };
  }

  var socket = new WebSocket('ws://' + location.host);
  socket.binaryType = 'arraybuffer';
  socket.onmessage = function(message) {
    var buff = message.data;
    for(var offset = 0, n = buff.byteLength; offset < n; offset += 12)
      drawLine(deserialize(buff, offset));
  };
};