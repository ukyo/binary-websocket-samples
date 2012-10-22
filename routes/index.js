
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index-json');
};

exports.indexBinary = function(req, res){
  res.render('index-binary');
};

exports.indexMsgpack = function(req, res){
  res.render('index-msgpack');
};