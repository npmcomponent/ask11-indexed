
/**
 * Module dependencies.
 */

// commented out by npm-component: var store        = require('store');
var each         = require('component-each');
var setImmediate = require('timoxley-next-tick');
var slice        = Array.prototype.slice;

/**
 * Expose `Indexed`.
 */

module.exports = Indexed;

/**
 * Wrap localStorage to async API.
 * TODO: DRY constructor with indexeddb
 * TODO: control consistent of store names
 *
 * @options {String} name
 * @options {Object} options
 * @api public
 */

function Indexed(name, options) {
  if (typeof name !== 'string') throw new TypeError('name required');
  if (!options) options = {};
  var params = name.split(':');

  this.dbName    = params[0];
  this.name      = params[1];
  this.key       = options.key || 'id';
  this.connected = true;
  this._validateKey();
}

// TODO: control DB names
// TODO: DRY with clear
Indexed.dropDb = function(name, cb) {
  each(store.getAll(), function(key, val) {
    if (key.indexOf(name) === 0) store.remove(key);
  });
  if (cb) setImmediate(cb);
};

// Always supported
Indexed.supported = store.enabled;

/**
 * Returns all values from the store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.all = async(function() {
  var result = [];
  var values = store.getAll();
  var name   = this._name();

  each(values, function(key, val) {
    if (key.indexOf(name) === 0) result.push(val);
  });
  return result;
});

/**
 * Get object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.get = async(function(key) {
  return store.get(this._key(key));
});

/**
 * Put - replace or create object by `key` with `val`.
 *
 * @options {Mixin} key
 * @options {Mixin} val
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.put = async(function(key, val) {
  val[this.key] = key;
  return store.set(this._key(key), val);
});

/**
 * Delete object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.del = async(function(key) {
  store.remove(this._key(key));
});

/**
 * Clear store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.clear = async(function() {
  var values = store.getAll();
  var name   = this._name();

  each(values, function(key, val) {
    if (key.indexOf(name) === 0) store.remove(key);
  });
});

/**
 * Handle key
 *
 * @options {Mixin} key
 * @return {String}
 * @api private
 */

Indexed.prototype._key = function(key) {
  if (typeof key !== 'string') key = JSON.stringify(key);
  return this._name() + key;
};

/**
 * Returns storage namespace
 *
 * @return {String}
 * @api private
 */

Indexed.prototype._name = function() {
  return this.dbName + ':' + this.name + ':';
};

/**
 * Validate keyPath, and if it changed recreate the store
 */

Indexed.prototype._validateKey = function() {
  var keys       = store.get('.indexed-keys') || {};
  var name       = this._name();
  var currentKey = keys[name];

  if (currentKey && currentKey !== this.key) Indexed.dropDb(name);
  if (!currentKey || currentKey !== this.key) {
    keys[name] = this.key;
    store.set('.indexed-keys', keys);
  }
};

/**
 * Helper to emulate async call.
 * Essential for all methods.
 */

function async(getVal) {
  return function() {
    var that = this;
    var args = slice.call(arguments, 0);
    var cb   = args[args.length - 1];

    setImmediate(function() {
      try {
        var res = getVal.apply(that, args.slice(0, -1));
        res ? cb(null, res) : cb(null);
      } catch (err) {
        cb(err);
      }
    });
  };
}
