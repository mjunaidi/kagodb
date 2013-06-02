/*! webapi.js */

var express = require('express');

/** This mixin provides webapi() method which gives a RESTful Web API feature for {@link http://expressjs.com Express.js}.
 * @class WebapiMixin
 * @mixin
 */

module.exports = function() {
  var mixin = {};
  mixin.webapi = webapi;
  return mixin;
};

/** This generates a RESTful Web API function for {@link http://expressjs.com Express.js}.
 * @method WebapiMixin.prototype.webapi
 * @returns {Function} a Web API function
 * @example
 * var express = require('express');
 * var KagoDB = require('KagoDB');
 * var app = express();
 * var opts = {
 *   storage: 'json',
 *   path: './data/'
 * };
 * app.all('/data/*', KagoDB(opts).webapi());
 * app.listen(3000);
 */

function webapi() {
  var collection = this;
  var f;
  var methods = new WebapiMethods();

  return function(req, res) {
    methods.progress('webapi:', req.method, req.url, req.query, req.body);

    var parser = collection.get('webapi-preprocess') || express.bodyParser();
    var responder = collection.get('webapi-responder') || res.send;
    responder = responder.bind(res);

    parser(req, res, function() {
      var params = getParams(req);
      if (!params.method) {
        return responder(400); // Bad Request
      }

      if (!methods[params.method]) {
        return responder(400); // Bad Request
      }
      methods[params.method](collection, params, responder);
    });
  };
}

function WebapiMethods() {}

WebapiMethods.prototype.read = function(collection, params, next) {
  var self = this;
  collection.exist(params.id, function(err, exist) {
    if (err) {
      console.error('read:', err);
      return next(500); // Internal Server Error
    }
    if (!exist) {
      return next(404); // Not Found
    }
    collection.read(params.id, function(err, item) {
      if (err) {
        console.error('read:', err);
        return next(500); // Internal Server Error
      }
      self.progress('read:', params.id, item);
      next(item);
    });
  });
};

WebapiMethods.prototype.write = function(collection, params, next) {
  var self = this;
  collection.write(params.id, params.content, function(err) {
    if (err) {
      console.error('write:', err);
      return next(500); // Internal Server Error
    }
    self.progress('write:', params.id);
    next({
      success: true
    });
  });
};

WebapiMethods.prototype.erase = function(collection, params, next) {
  var self = this;
  collection.erase(params.id, function(err) {
    console.error('erase:', params.id, err);
    if (err) {
      console.error('erase:', err);
      return next(500); // Internal Server Error
    }
    self.progress('erase:', params.id);
    next({
      success: true
    });
  });
};

WebapiMethods.prototype.exist = function(collection, params, next) {
  var self = this;
  collection.exist(params.id, function(err, exist) {
    if (err) {
      console.error('exist:', err);
      return next(500); // Internal Server Error
    }
    self.progress('exist:', params.id, !! exist);
    next({
      exist: !! exist
    });
  });
};

WebapiMethods.prototype.find = function(collection, params, next) {
  var self = this;
  var cursor = collection.find(params.condition, params.projection);
  if (params.limit) cursor.limit(params.limit);
  if (params.offset) cursor.offset(params.offset);
  if (params.sort) cursor.sort(params.sort);
  cursor.toArray(function(err, list) {
    if (err) {
      console.error('find:', err);
      return next(500); // Internal Server Error
    }
    self.progress('find:', params, list.length);
    next({
      data: list
    });
  });
};

WebapiMethods.prototype.count = function(collection, params, next) {
  var self = this;
  collection.count(params.condition, function(err, count) {
    if (err) {
      console.error('count:', err);
      return next(500); // Internal Server Error
    }
    self.progress('count:', params);
    next({
      count: count
    });
  });
};

WebapiMethods.prototype.index = function(collection, params, next) {
  var self = this;
  collection.index(function(err, list) {
    if (err) {
      console.error('index:', err);
      return next(500); // Internal Server Error
    }
    self.progress('index:', params);
    next({
      index: list
    });
  });
};

function getParams(req) {
  var http_method = req.method.toLowerCase();
  var params = (http_method == 'post') ? req.body : req.query;
  var id = req.params[0];
  if (id) params.id = id;

  if (!params.method) {
    switch (http_method) {
      case 'get':
        params.method = 'read';
        break;

      case 'put':
        params.method = 'write';
        params.content = req.body;
        break;

      case 'delete':
        params.method = 'erase';
        break;

      case 'head':
        // params.method = 'exist';
        params.method = 'read';
        break;
    }
  }

  if (typeof params.content === 'string') {
    params.content = contentParser(params.content);
  }

  return params;
}

WebapiMethods.prototype.progress = function() {
  // console.error.apply(null, arguments);
};

function contentParser(content) {
  var body;
  try {
    body = JSON.parse(content);
  } catch (e) {
    console.error(e, content);
  }
  return body;
}
