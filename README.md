#binary websocketをはじめよう

みなさん、websocketで何かしらの構造化されたデータを送るとき、どうやってシリアライズしているでしょうか。
おそらく `JSON.stringify` あたりを使ってJSON文字列にしていますよね。実際、これは一番手軽な方法です。
しかし、通信量やCPUの処理コスト(特にサーバ側)などを考えるとJSONというものは結構無駄があります。

より通信量やCPUコストを抑える一つの方法として、バイナリでデータをやりとりする方法があります。
これはネイティブなアプリやサーバサイドでは昔から行われていたことです。
JavaScriptでも文字列をバイナリに見立てて処理するという方法もありましたが、現実的ではありませんでした。
しかし、最近ではHTML5関連のAPIでTypedArrayというものが登場して、
バイナリ操作も以前より格段に楽に行えるようになっています。
もちろんwebsocketでもバイナリ形式でのやりとりをサポートしています。
現状では、バイナリでの通信は全ての環境で使えるというわけではありませんが、そのうち絶対に使うようになるはずです。

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

![screenshot](https://raw.github.com/ukyo/binary-websocket-samples/master/image/screenshot.png)

線のデータ構造は以下の表のように定義します。

名前 | データ
-----|-------
color| 線の色。rgb値。例:`[255, 255, 255]`
start| 線の開始位置の座標。例:`[100, 200]`
end  | 線の終了位置の座標。
width| 線の幅。

###共通部分

####クライアント側

途中の部分を省略しますが、
大まかな流れとしては `Paper` の引数 `sendMessage` にwebsocketでメッセージを送る部分を実装したものを渡して、
マウスで線を描いたときに、 `sendMessage` を呼ぶようなかんじです。
関数の外から線の描写ができるように `drawLine` を返します。

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

####サーバ側

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
    res.render('index-' + type);
  });
  return wsServer;
};
```

###JSON

####クライアント側
####サーバ側

###MessagePack

####クライアント側
####サーバ側

###独自の構造のバイナリ

####クライアント側
####サーバ側

##まとめ

##おまけ
