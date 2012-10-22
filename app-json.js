var wsServer = require('./init-server')('json');

var conns = [];
var lines = [];

wsServer.on('request', function(req) {
  var conn = req.accept(null, req.origin);
  conns.push(conn);

  conn.sendUTF(JSON.stringify(lines));

  conn.on('message', function(message) {
    var line = JSON.parse(message.utf8Data);

    lines.push(line);

    conns.forEach(function(other) {
      if(conn === other) return;
      other.sendUTF(message.utf8Data);
    });
  });

  conn.on('close', function() {
    var index = conns.indexOf(conn);
    if(index !== 1) conns.splice(index, 1);
  });
});