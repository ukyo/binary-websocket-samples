function Paper(sendMessage) {
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
      color: lineColor,
      start: [startX, startY],
      end: [endX, endY],
      width: lineWidth
    };

    drawLine(line);
    sendMessage(line);

    startX = endX;
    startY = endY;
  };

  function drawLine(line) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgb(' + line.color.join(',') + ')';
    ctx.lineCap = 'round';
    ctx.lineWidth = line.width;
    ctx.moveTo.apply(ctx, line.start);
    ctx.lineTo.apply(ctx, line.end);
    ctx.stroke();
    ctx.closePath();
  }

  return {
    drawLine: drawLine
  };
}