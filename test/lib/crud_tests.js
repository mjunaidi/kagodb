/*! crud.js */

var assert = require('chai').assert;

module.exports = crud_tests;

function crud_tests(kit) {
  var date = (new Date()).toJSON().replace(/\.\d+|\D/g, '');
  var id1 = 'foo-' + date;
  var id2 = 'bar-' + date;
  var item = {
    string: "FOO",
    decimal: 123,
    numeric: 45.67
  };

  it('write', function(done) {
    kit.collection.write(id1, item, function(err) {
      assert(!err, 'write failed');
      done();
    });
  });

  it('exist', function(done) {
    kit.collection.exist(id1, function(err, res) {
      assert(!err, 'exist failed');
      assert.ok(res, 'exist foo');
      kit.collection.exist(id2, function(err, res) {
        assert(!err, 'not-exist failed');
        assert.ok(!res, 'not-exist bar');
        done();
      });
    });
  });

  it('read', function(done) {
    kit.collection.read(id1, function(err, res) {
      assert(!err, 'read failed');
      assert.isString(res.string, 'read string type');
      assert.isNumber(res.decimal, 'read decimal type');
      assert.isNumber(res.numeric, 'read numeric type');
      assert.equal(res.string, item.string, 'read string content');
      assert.equal(res.decimal, item.decimal, 'read decimal content');
      assert.equal(res.numeric, item.numeric, 'read numeric content');
      kit.collection.read(id2, function(err, res) {
        assert.ok(err, 'read error detected');
        done();
      });
    });
  });

  it('index & find', function(done) {
    kit.collection.index(function(err, list) {
      assert(!err, 'index failed');
      assert.ok(list, 'index response');
      list = list || [];
      assert.ok(list.length, 'index length');

      kit.collection.find().toArray(function(err, res) {
        assert(!err, 'find failed');
        assert.ok(res, 'find response');
        res = res || [];
        assert.equal(res.length, list.length, 'find length');
        done();
      });
    });
  });

  it('erase', function(done) {
    kit.collection.erase(id1, function(err) {
      assert(!err, 'erase failed');
      kit.collection.exist(id1, function(err, res) {
        assert(!err, 'exist failed');
        assert.ok(!res, 'not-exist foo');
        kit.collection.erase(id2, function(err) {
          assert.ok(err, 'erase error detected');
          done();
        });
      });
    });
  });
}