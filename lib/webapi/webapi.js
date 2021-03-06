/*! webapi.js */

var bodyParser = require('body-parser');

var WebMethods = require('./webmethods');

var BAD_REQUEST = 400;
var INTERNAL_SERVER_ERROR = 500;

/**
 * This mixin provides
 * [webapi()]{@linkcode KagoDB#webapi} and
 * [webmethods()]{@linkcode KagoDB#webmethods} and
 * method to implement a RESTful Web API feature for
 * {@link http://expressjs.com Express.js}.
 *
 * @class webapi
 * @mixin
 * @example
 *
 * // This emulates how webapi() works with express to provide RESTful Web APIs.
 *
 * var express = require('express');
 * var KagoDB = require('KagoDB');
 *
 * var collection = new KagoDB({ storage: 'memory' });
 * var webapi = collection.webapi();
 * var webmethods = collection.webmethods(); // == webapi.methods
 *
 * var app = express();
 * app.use(webapi.bodyParser());
 * app.use(webapi.prepare());
 * app.use(webapi.ready());
 * app.put('/data/:id?', webmethods.write);
 * app.del('/data/:id?', webmethods.erase);
 * app.all('/data/:id?', webapi.dispatch(webmethods));
 * app.head('/data/:id?', webmethods.read);
 * app.get('/data/:id?', webmethods.read);
 * app.use(webapi.cleanup());
 * app.use(webapi.error(400));
 * app.listen(3000);
 */

module.exports = function() {
  var mixin = {};
  mixin.webapi = webapi;
  mixin.webmethods = webmethods;
  return mixin;
};

/**
 * This returns a set of bridge methods from express app to KagoDB.
 *
 * @method KagoDB.prototype.webmethods
 * @returns {WebMethods}
 */

function webmethods() {
  return new WebMethods();
}

/**
 * This generates a RESTful Web API function for {@link http://expressjs.com Express.js}.
 *
 * @method KagoDB.prototype.webapi
 * @returns {Function} a Web API function for express
 * @example
 * var express = require('express');
 * var KagoDB = require('KagoDB');
 *
 * var opts = {
 *   storage: 'json',
 *   path: './data/'
 * };
 *
 * var app = express();
 * app.use(express.static(__dirname + '/public'));
 * app.all('/data/:id?', KagoDB(opts).webapi());
 * app.listen(3000);
 */

function webapi() {
  var collection = this;

  var api = function(req, res, next) {
    var app = mw_pipe();
    app.use(api.bodyParser());
    app.use(api.prepare());
    app.use(api.ready());
    app.use(verb('put', api.methods.write));
    app.use(verb('delete', api.methods.erase));
    app.use(api.dispatch(api.methods));
    app.use(verb('head', api.methods.read));
    app.use(verb('get', api.methods.read));
    app.use(api.cleanup());
    app.use(api.error(BAD_REQUEST));
    app.run(req, res, next);
  };

  api.bodyParser = getBodyParser();

  api.prepare = function() {
    return function(req, res, next) {
      req.kagodb = collection;
      req.kagoapi = api;
      next();
    };
  };

  api.ready = function() {
    return NOOP;
  };

  api.methods = collection.webmethods();

  api.dispatch = function(methods) {
    methods = methods || api.methods;
    return function(req, res, next) {
      var method = get_param(req, 'method');
      if (!method) {
        return next();
      }
      var func = methods[method];
      if (!func) {
        return next();
      }
      func(req, res, next);
    };
  };

  api.cleanup = function() {
    return function(req, res, next) {
      delete req.kagodb;
      delete req.api;
      next();
    };
  };

  api.error = function(code) {
    return function(req, res, next) {
      if (!code) code = INTERNAL_SERVER_ERROR;
      res.status(code).end();
    };
  };

  api.parse = function(value) {
    if ('string' !== typeof value) return value;
    try {
      value = JSON.parse(value);
    } catch (err) {
      collection.emit('warn', 'JSON.parse error', err, value);
      value = err;
    }
    return value;
  };

  return api;
}

function mw_pipe() {
  function mw() {}
  mw.run = NOOP;
  mw.use = function(job) {
    mw.run = mw_join(mw.run, job);
  };
  return mw;
}

function mw_join(first, second) {
  return function(req, res, next) {
    var that = this;
    first.call(that, req, res, function() {
      second.call(that, req, res, next);
    });
  };
}

function verb(method, job) {
  return function(req, res, next) {
    if (req.method.toLowerCase() == method) {
      job(req, res, next);
    } else {
      next();
    }
  };
}

function getBodyParser() {
  if (!bodyParser) return checkBodyParsed;
  var urlencoded = bodyParser.urlencoded;
  var json = bodyParser.json;
  if (!urlencoded || !json) return checkBodyParsed;
  var opts = {
    extended: true
  };
  var joined = mw_join(urlencoded(opts), json());
  return function() {
    return joined;
  };
}

function checkBodyParsed() {
  return function(req, res, next) {
    if (!req.body) {
      throw new Error('req.body not parsed. add "app.use(express.bodyParser());" before using webapi()');
    }
    next();
  };
}

function NOOP(req, res, next) {
  next();
}

/**
 * @ignore
 */

function get_param(req, name) {
  if (req.params && (name in req.params)) return req.params[name];
  if (req.body && (name in req.body)) return req.body[name];
  if (req.query && (name in req.query)) return req.query[name];
}