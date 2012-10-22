var wsServer = require('./init-server')('msgpack')
  , msgpack = require('msgpack');

var conns = [];
var lines = [];

wsServer.on('request', function(req) {
  var conn = req.accept(null, req.origin);
  conns.push(conn);

  conn.sendBytes(msgpack.pack(lines));

  conn.on('message', function(message) {
    var line = msgpack.unpack(message.binaryData);

    lines.push(line);

    conns.forEach(function(other) {
      if(conn === other) return;
      other.sendBytes(message.binaryData);
    });
  });

  conn.on('close', function() {
    var index = conns.indexOf(conn);
    if(index !== 1) conns.splice(index, 1);
  });
});