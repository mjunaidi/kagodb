/*! yaml.test.js */

var assert = require('chai').assert;
var fs = require('fs');
var KagoDB = require('../index');

describe('YAML Storage', function() {
  var collection;
  var opts = {
    storage: 'yaml',
    path: './data'
  };
  var date = (new Date()).toJSON().replace(/\.\d+|\D/g, '');
  var id1 = 'foo-' + date;
  var id2 = 'bar-' + date;
  var item = {
    string: "FOO",
    decimal: 123,
    numeric: 45.67
  };

  var path1 = opts.path + '/' + id1 + '.' + opts.storage;
  var path2 = opts.path + '/' + id2 + '.' + opts.storage;

  beforeEach(function() {
    collection = new KagoDB(opts);
  });

  describe('CRUD', function() {
    it('write', function(done) {
      collection.write(id1, item, function(err) {
        assert(!err, 'write failed');
        done();
      });
    });

    it('exist', function(done) {
      collection.exists(id1, function(err, res) {
        assert(!err, 'exist failed');
        assert.ok(res, 'exist foo');
        collection.exists(id2, function(err, res) {
          assert(!err, 'not-exist failed');
          assert.ok(!res, 'not-exist bar');

          fs.stat(path1, function(err, stat) {
            assert(!err, 'file 1 exists');
            fs.stat(path2, function(err, stat) {
              assert(err, 'file 2 not exists');
              done();
            });
          });
        });
      });
    });

    it('read', function(done) {
      collection.read(id1, function(err, res) {
        assert(!err, 'read failed');
        assert.isString(res.string, 'read string type');
        assert.isNumber(res.decimal, 'read decimal type');
        assert.isNumber(res.numeric, 'read numeric type');
        assert.equal(res.string, item.string, 'read string content');
        assert.equal(res.decimal, item.decimal, 'read decimal content');
        assert.equal(res.numeric, item.numeric, 'read numeric content');
        collection.read(id2, function(err, res) {
          assert.ok(err, 'read error detected');
          done();
        });
      });
    });

    it('keys & find', function(done) {
      collection.keys(function(err, list) {
        assert(!err, 'keys failed');
        assert.ok(list, 'keys response');
        list = list || [];
        assert.ok(list.length, 'keys length');

        collection.find().toArray(function(err, res) {
          assert(!err, 'find failed');
          assert.ok(res, 'find response');
          res = res || [];
          assert.equal(res.length, list.length, 'find length');
          done();
        });
      });
    });

    it('remove', function(done) {
      collection.remove(id1, function(err) {
        assert(!err, 'remove failed');
        collection.exists(id1, function(err, res) {
          assert(!err, 'exist failed');
          assert.ok(!res, 'not-exist foo');
          collection.remove(id2, function(err) {
            assert.ok(err, 'remove error detected');

            fs.stat(path1, function(err, stat) {
              assert(err, 'file 1 exists');
              fs.stat(path2, function(err, stat) {
                assert(err, 'file 2 not exists');
                done();
              });
            });
          });
        });
      });
    });
  });
});