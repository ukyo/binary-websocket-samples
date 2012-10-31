#binary websocketをはじめよう

これは[東京Node学園祭2012 アドベントカレンダー](http://atnd.org/events/33022)11日目の記事です。

みなさん、websocketで何かしらの構造化されたデータを送るとき、どうやってシリアライズしているでしょうか。
おそらく `JSON.stringify` あたりを使ってJSON文字列にしていますよね。実際、これは一番手軽な方法です。
しかし、通信量やCPUの処理コスト(特にサーバ側)などを考えるとJSONというものは結構無駄があります。

より通信量やCPUコストを抑える一つの方法として、バイナリでデータをやりとりする方法があります。
これはネイティブなアプリやサーバサイドでは昔から行われていたことです。
JavaScriptでも文字列をバイナリに見立てて処理するという方法もありましたが、あまり現実的ではありませんでした。
しかし、最近ではHTML5関連のAPIでTypedArrayというものが登場して、
バイナリ操作が以前より格段に楽に行えるようになっています。
もちろんwebsocketでもバイナリ形式でのやりとりをサポートしています。

ここではwebsocketでお絵かきアプリ線データのシリアライズ・デシリアライズ部分を

* JSON
* MessagePack
* 独自の構造のバイナリ

のそれぞれで実装してみました。以下の章で見ていきたいと思います。

ここで紹介するデモアプリはgithubより落として試すことができます(Chromeでしか動作確認していません)。

###インストール

```
git clone git://github.com/ukyo/binary-websocket-samples.git
cd binary-websocket-samples
npm install
```

###アプリの起動

`app-json.js`,`app-msgpack.js`,`app-binary.js` の3種類がありますが、
実装の仕方が違うだけでブラウザ上での挙動は同じです。
以下、 `app-json.js` での実行例です。

```
node app-json.js
```

##お絵かきアプリの概要

以下の画像のようにカラーピッカーと線の太さを変えるスライダーのついたお絵かきアプリを実装しました。
線の描写やUI部分などは共通なもので、シリアライズ・デシリアライズ部分(と一応websocketで通信する部分)
だけを別に実装しています。

websocketサーバの実装としては [Worlize/WebSocket-Node](https://github.com/Worlize/WebSocket-Node)
を使用しています。

![screenshot](https://raw.github.com/ukyo/binary-websocket-samples/master/image/screenshot.png)

線のデータ構造は以下の表のように定義します。

名前 | データ
-----|-------
color| 線の色。rgb値。例:`[255, 255, 255]`
start| 線の開始位置の座標。例:`[100, 200]`
end  | 線の終了位置の座標。
width| 線の幅。

以下、共通部分、JSON、MessagePack、独自の構造のバイナリのそれぞれの実装についてクライアント、サーバにわけて見ていきます。

##共通部分

###クライアント側

[public/javascripts/paper.js](https://github.com/ukyo/binary-websocket-samples/blob/master/public/javascripts/paper.js)

途中の部分を省略しますが、
`Paper` はキャンバスやカラーピッカーなどを初期化する関数です。
実行すると外部から線の描写を行う `drawLine` メソッドを持つオブジェクトを返します。
`Paper` の引数 `sendMessage` にはwebsocketでメッセージを送る部分を実装したものを渡します。
この `sendMessage` はマウスで線を描いたときに呼び出されます。

```javascript
function Paper(sendMessage) {
  var canvas = document.querySelector('canvas');
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  var ctx = canvas.getContext('2d');

  var startX, startY, endX, endY, lineColor = [0, 0, 0], lineWidth = 1;

  //...

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
    //...
  }

  return {
    drawLine: drawLine
  };
}
```

###サーバ側

[init-server.js](https://github.com/ukyo/binary-websocket-samples/blob/master/init-server.js)

どのテンプレートを使うかを決めて `WebSocketServer` のインスタンスを返すだけです。
特に問題はなさそうです。

```javascript
var express = require('express')
  , http = require('http')
  , path = require('path')
  , WebSocketServer = require('websocket').server;

var app = express();

//...

var httpServer = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var wsServer = new WebSocketServer({
  httpServer: httpServer
});

module.exports = function(type) {
  app.get('/', function(req, res) {
    //使うテンプレートを決める
    res.render('index-' + type);
  });
  return wsServer;
};
```

##シリアライザ部分

###JSON

つまり一般的な方法です。

####クライアント側

[public/javascripts/script-json.js](https://github.com/ukyo/binary-websocket-samples/blob/master/public/javascripts/script-json.js)

特に問題ないですね。送るときに `JSON.stringify` して受け取ったときに `JSON.parse` するだけです。

```javascript
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
```

####サーバ側

[app-json.js](https://github.com/ukyo/binary-websocket-samples/blob/master/app-json.js)

コネクションを確立したら `conns` に加えて、
切れたら対象のコネクションを取り除きます。
`lines` に線のデータを格納して、
コネクション確立時に `lines` の全データをクライアントに転送します。

基本的には同じような実装ですが、シリアライズ・デシリアライズ部分だけ違いがあります。

```javascript
var wsServer = require('./init-server')('json');

var conns = [];
var lines = [];

wsServer.on('request', function(req) {
  var conn = req.accept(null, req.origin);
  conns.push(conn);

  //初回は全データを転送
  conn.sendUTF(JSON.stringify(lines));

  conn.on('message', function(message) {
    var line = JSON.parse(message.utf8Data);

    lines.push(line);

    //通常時は一個ずつ転送する
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
```

###MessagePack

汎用のバイナリのシリアライザの一つである [MessagePack](http://msgpack.org/) を使用した方法です。

MessagePackの実装として、
クライアント側では [uupaa/msgpack.js](https://github.com/uupaa/msgpack.js), 
サーバ側では [pgriess/node-msgpack](https://github.com/pgriess/node-msgpack)
を使用しています。

####クライアント側

[public/javascripts/script-msgpack.js](https://github.com/ukyo/binary-websocket-samples/blob/master/public/javascripts/script-msgpack.js)

`msgpack.pack` はJavaScriptのオブジェクトをバイト配列(これはあくまでもJavaScriptの配列)に
シリアライズします。
当然、このままでは送れないので `ArrayBuffer` に変換します。
変換自体は簡単です。 `Uint8Array` コンストラクタに配列を渡すと各要素が元の配列と同じ `Uint8Array`
のインスタンスが生成されます。
このインスタンスの `buffer` プロパティが実際のデータ(`ArrayBuffer` オブジェクト)になります。

デシリアライズはどうやら配列ライクにアクセスできるものならなんでもオブジェクトに変換してくれるようです
(もちろんMessagePackとして正しい必要はあります)。
具体的には受け取った `ArrayBuffer` から `Uint8Array` のインスタンスを生成して、 `msgpack.unpack` に渡すだけです。

あと、 `socket.binaryType = 'arraybuffer'` の部分は `ArrayBuffer` でやりとりする場合は必要になります。

```javascript
window.onload = function() {
  
  function sendMessage (line) {
    socket.send(new Uint8Array(msgpack.pack(line)).buffer);
  }

  var paper = Paper(sendMessage);
  var socket = new WebSocket('ws://' + location.host);
  
  socket.binaryType = 'arraybuffer';
  socket.onmessage = function(message) {
    var lines = msgpack.unpack(new Uint8Array(message.data));

    if(!Array.isArray(lines)) {
      paper.drawLine(lines);
      return;
    }

    for(var i = 0, n = lines.length; i < n; ++i)
      paper.drawLine(lines[i]);
  };
};
```

####サーバ側

[app-msgpack.js](https://github.com/ukyo/binary-websocket-samples/blob/master/app-msgpack.js)

ここではクライアントから受け取ったデータを一旦JavaScriptのオブジェクトに変換しています。
バイナリのまま保存することも考えたのですが(つまり、いっぺんに送るときはバイナリ的にくっつけるだけ)、
msgpack.jsの実装では配列にくるんでからシリアライズしなくてはいけないようなので、
このようになっています(データベースに保存する場合はどのみちデシリアライズしなくてはいけませんが)。

```javascript
var wsServer = require('./init-server')('msgpack')
  , msgpack = require('msgpack');

var conns = [];
var lines = [];

wsServer.on('request', function(req) {
  var conn = req.accept(null, req.origin);
  conns.push(conn);

  //バイナリデータを送る場合はsendBytesメソッドを使います
  conn.sendBytes(msgpack.pack(lines));

  conn.on('message', function(message) {
    //受け取ったバイナリデータはbinaryDataプロパティに格納されています。
    var line = msgpack.unpack(message.binaryData);

    lines.push(line);

    conns.forEach(function(other) {
      if(conn === other) return;
      other.sendBytes(message.binaryData);
    });
  });

  //...
});
```

###独自の構造のバイナリ

線のデータをよく見ると、rgb値はそれぞれ1byte、各x, y座標2byte、始点、終点の計8byte、
線の太さは1byteもあれば足りそうです。
たったの12byteです。
ここでは以下のような、c言語の構造体のように順番にデータが並んだような構造のバイナリデータを定義して、それを使用します。

![line](https://raw.github.com/ukyo/binary-websocket-samples/master/image/line.png)

* r: 赤 1byte
* g: 緑 1byte
* b: 青 1byte
* sx: 始点のx座標 2byte
* sy: 始点のy座標 2byte
* ex: 終点のx座標 2byte
* ey: 終点のy座標 2byte
* w: 線の太さ 1byte

####クライアント側

[public/javascripts/script-binary.js](https://github.com/ukyo/binary-websocket-samples/blob/master/public/javascripts/script-binary.js)

ここではJavaScriptのオブジェクトを手動でシリアライズ・デシリアライズします。
シリアライズするには、まず `ArrayBuffer` コンストラクタを使って、
必要なバイト数だけの領域を確保します。
次に、確保した領域に対して `DataView` で値を格納していきます。
以下の例のように `view.setHoge(offset ,value, isLittleEndian)` で格納します。
2byte以上の場合は3番目の引数にエンディアンを指定できます。
`true` の場合はリトルエンディアンで `false` の場合はビッグエンディアンです(デフォルトはビッグエンディアン)。
直接 `Uint16Array` のようなものを使って値を格納することもできますが、
エンディアンは環境依存なので全ての環境で動くとは限りません
(ほとんどリトルエンディアンでしょうが、バックエンドがJava VMなものはビッグエンディアン?ちょっと確認してない)。

逆にデシリアライズするときは、
`view.getHoge(offset, isLittleEndian)` で値を取得できます。
今回、データのバイト数が固定長なので配列は単純にバイナリを連結するだけで表現できます。
データの取得は `offset` 分だけずらしながら操作するだけです。

```javascript
window.onload = function() {

  /**
   * @param  {Object} line
   * @return {ArrayBuffer}
   */
  function serialize(line) {
    var buff = new ArrayBuffer(12);
    var view = new DataView(buff);
    // line color
    view.setUint8(0, line.color[0]);
    view.setUint8(1, line.color[1]);
    view.setUint8(2, line.color[2]);
    // start point
    view.setUint16(3, line.start[0], true);
    view.setUint16(5, line.start[1], true);
    // end point
    view.setUint16(7, line.end[0], true);
    view.setUint16(9, line.end[1], true);
    // line width
    view.setUint8(11, line.width);
    return buff;
  }

  /**
   * @param  {ArrayBuffer} buff
   * @param  {number} offset
   * @return {Object}
   */
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
```

####サーバ側

[app-binary.js](https://github.com/ukyo/binary-websocket-samples/blob/master/app-binary.js)

ここではデータベースに保存するわけでもないので、
バイナリのまま `lines` にデータをためておきます。
初回通信時には `lines` 内のバイナリを単純に連結して送るだけ、
通常時は受け取ったバイナリをそのまま他のクライアントに送るだけです。

```javascript
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
```

##余談

###node.jsのBuffer

node.jsでバイナリデータを扱うときは基本的に `Buffer` オブジェクトを使います(TypedArrayもあることはある)。
以下はnode.jsで線のデータをシリアライズ・デシリアライズする例です。

```javascript
function serialize(line) {
  var buff = new Buffer(12);
  // line color
  buff.writeUInt8(line.color[0], 0);
  buff.writeUInt8(line.color[1], 1);
  buff.writeUInt8(line.color[2], 2);
  // start point
  buff.writeUInt16LE(line.start[0], 3);
  buff.writeUInt16LE(line.start[1], 5);
  // end point
  buff.writeUInt16LE(line.end[0], 7);
  buff.writeUInt16LE(line.end[1], 9);
  // line width
  buff.writeUInt8(line.width, 11);
  return buff;
}

function deserialize(buff, offset) {
  return {
    color: [
      buff.readUInt8(offset + 0),
      buff.readUInt8(offset + 1),
      buff.readUInt8(offset + 2)
    ],
    start: [
      buff.readUInt16LE(offset + 3),
      buff.readUInt16LE(offset + 5)
    ],
    end: [
      buff.readUInt16LE(offset + 7),
      buff.readUInt16LE(offset + 9)
    ],
    width: buff.readUInt8(offset + 11)
  };
}
```

###パフォーマンス的なこと

サイズ的なことだと、ほとんど文字列しか扱わない場合は、別にJSONでもよさそうです。
数値主体のデータの場合はサイズに差が出てきます。
今回の場合だとJSONで約60byte,MessagePackで約40byte,cの構造体ライクな方法だと12byteです。
よくよく見るとなんか涙ぐましいですね(画像一枚でその努力も吹き飛びそう)。
とは言っても、処理速度的にはバイナリを使ったほうがやっぱり速いですし、
そもそも画像もwebsocketで送ればいいんです。

##まとめ

以上、websocketでバイナリを使って通信する方法について解説してみました。
手動でバイナリにシリアライズするのはちょっと面倒そうですが、
MessagePackを使う方法なら今までのJSONを使った方法と対して変わりませんよね。
バイナリだからってむちゃくちゃ面倒臭いわけじゃないというがわかったかと思います。

まぁ、そんなこと言ってもwebsocket自体が現状どれだけ使えるのという話ですが、
例えばソーシャルゲームでどこがボトルネックになっているかというと、
多分こういう部分ですよね。
そういえばFlashだとwebsocket使えるんでしたっけ。
実はPCブラウザ界では、Flash + node.jsという現実的な解があったんですね。

##参考

* [WebSocketのバイナリメッセージを試したら、ウェブの未来が垣間見えた](http://blog.agektmr.com/2012/03/websocket.html)
* [WebSocketでバイナリデータを送受信してみる](http://d.hatena.ne.jp/hagino_3000/20111209/1323372153)
* [TYPED ARRAYS: BINARY DATA IN THE BROWSER](http://www.html5rocks.com/ja/tutorials/webgl/typed_arrays/)