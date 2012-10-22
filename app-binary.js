var wsServer = require('./init-server')('binary');

var conns = [];
var lines = [];

wsServer.on('request', function(req) {
  var conn = req.accept(null, req.origin);
  conns.push(conn);

  conn.sendBytes(Buffer.concat(lines));

  conn.on('message', function(message) {
    var line = message.binaryData;

    lines.push(line);

    conns.forEach(function(other) {
      if(conn === other) return;
      other.sendBytes(line);
    });
  });

  conn.on('close', function() {
    var index = conns.indexOf(conn);
    if(index !== 1) conns.splice(index, 1);
  });
});