
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , WebSocketServer = require('websocket').server
  , msgpack = require('msgpack');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.indexMsgpack);

var httpServer = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var wsServer = new WebSocketServer({
  httpServer: httpServer
});

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