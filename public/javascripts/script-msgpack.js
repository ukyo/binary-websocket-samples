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
    socket.send(new Uint8Array(msgpack.pack(line)).buffer);

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

  var socket = new WebSocket('ws://' + location.host);
  socket.binaryType = 'arraybuffer';
  socket.onmessage = function(message) {
    var lines = msgpack.unpack(new Uint8Array(message.data));

    if(!Array.isArray(lines)) {
      drawLine(lines);
      return;
    }
    
    for(var i = 0, n = lines.length; i < n; ++i)
      drawLine(lines[i]);
  };
};