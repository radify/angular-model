(function(window, angular, undefined) {
'use strict';

var noop   = angular.noop,
  forEach  = angular.forEach,
  extend   = angular.extend,
  copy     = angular.copy,
  isFunc   = angular.isFunction,
  isObject = angular.isObject,
  isArray  = angular.isArray,
  isUndef  = angular.isUndefined,
  equals   = angular.equals;

function deepExtend(dst, source) {
  for (var prop in source) {
    if (source[prop] && source[prop].constructor && source[prop].constructor === Object) {
      dst[prop] = dst[prop] || {};
      deepExtend(dst[prop], source[prop]);
      continue;
    }
    dst[prop] = source[prop];
  }
  return dst;
}

function isEmpty(obj) {
  var name;
  for (name in obj) return false;
  return true;
}

function inherit(parent, extra) {
  return extend(new (extend(function() {}, {prototype: parent}))(), extra);
}

function hyphenate(str) {
  var toLower = function($1) { return "-" + $1.toLowerCase(); };
  return str.replace(/([A-Z])/g, toLower).replace(/^-+/, '');
}

function serialize(obj, prefix) {
  var str = [];
  var enc = encodeURIComponent;

  for (var p in obj) {
    var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
    str.push(isObject(v) ? serialize(v, k) : enc(k) + "=" + enc(v));
  }
  return str.join("&");
}


angular.module('ur.model', []).provider('model', function() {

  var expr, // Used to evaluate expressions; initialized by the service invokation
      http, // Provider-level copy of $http service
      q;    // Provider-level copy of $q service

  // "Box" an object value in a model instance if it is present.
  // Otherwise, return an empty model object.
  function autoBox(object, model, data) {
    if (!object) {
      return isArray(data) ? model.collection(data, true) : model.instance(data);
    }
    if (isArray(data) && isArray(object)) {
      return model.collection(data, true);
    }
    if (data && JSON.stringify(data).length > 3) {
      var updated = extend(object, data);
      extend(updated.$original, data);
      return updated;
    }
    return object;
  }

  // Global registry of settings
  var global = {

    // Base URL prepended to generated URLs
    base: "",

    // Extract URL from object, or use default URL
    url: function(object) {
      if (object instanceof ModelClass) {
        return object.url();
      }
      if (object instanceof ModelInstance || isFunc(object.$model)) {
        var model = object.$model();
        return expr(object, model.$config().identity).get() || model.url();
      }
      throw new Error("Could not get URL for " + typeof object);
    }
  };

  // Master registry of application model configurations
  var registry = {};

  // Default configuration for new model classes
  var DEFAULTS = {

    // Default values which should be applied when creating a new model instance
    defaults: {},

    // The name of the key to the URL that identifies the object
    identity: "$links.self",

    // The name of the key to assign an object map of errors
    errors: "$errors"
  };

  var DEFAULT_METHODS = {

    // Methods available on the model class
    $class: {
      all: function(data, headers) {
        return $request(null, this, 'GET', data, headers);
      },
      first: function(data) {
        return this.all(data).then(function(response) {
          return angular.isArray(response) ? response[0] : response;
        }, function() {
          return null;
        });
      },
      create: function(data) {
        return this.instance(deepExtend(copy(this.$config().defaults), data || {}));
      },
  
      // @todo Get methods for related objects
      $related: function(object) {
        if (!object.$links) return [];
  
        forEach(object.$links, function(url, name) {
          object.prototype[name] = function() {
            
          };
        });
      }
    },

    // Methods available on model instances
    $instance: {
      $original: {},
      $save: function(data) {
        var method, requestData;

        if (this.$exists()) {
          method = 'PATCH';
          requestData = data ? copy(data) : this.$modified();
        } else {
          method = 'POST';
          requestData = deepExtend(this, data ? copy(data) : {});
        }

        return $request(this, this.$model(), method, requestData);
      },
      $delete: function() {
        return $request(this, this.$model(), 'DELETE');
      },
      $reload: function() {
        return $request(this, this.$model(), 'GET');
      },
      $revert: function() {
        for (var prop in this.$original) {
          this[prop] = this.$original[prop];
        }
      },
      $exists: function() {
        return !!expr(this, this.$model().$config().identity).get();
      },
      $dirty: function() {
        return !this.$pristine();
      },
      $pristine: function() {
        return equals(this, this.$original);
      },
      $modified: function() {
        var diff = {};

        for (var prop in this.$original) {
          if (!equals(this[prop], this.$original[prop])) {
            diff[prop] = this[prop];
          }
        }

        return diff;
      }
    },

    // Methods available on model collections
    $collection: {
      add: function(object, data) {
        return object.$save(data || {});
      },
      remove: function(index) {
        index = (typeof index !== 'number') ? index = this.indexOf(index) : index;
        var self = this, result = self[index].$delete();
        result.then(function() { self.splice(index, 1); });
        return result;
      }
    }
  };

  function $request(object, model, method, data, headers) {
    var writeMethods = ['POST', 'PUT', 'PATCH'];
    var defaultHeaders = { 'Content-Type': 'application/json;charset=UTF-8' };
    var isWrite = writeMethods.indexOf(method) > -1;
    headers = extend({}, isWrite ? defaultHeaders : {}, headers);

    var deferred = q.defer(), params = {
      method:  method,
      url:     global.url(object || model),
      data:    data,
      headers: headers
    };

    if (!isWrite && isObject(data) && !isEmpty(data)) {
      params.url += (params.url.indexOf('?') > -1 ? '&' : '?') + serialize(data);
    }

    return extend(deferred.promise, {
      $response: null,
      $request: http(params).then(function(response) {
        deferred.promise.$response = response;
        deferred.resolve(autoBox(object, model, response.data));
      }, function(response) {
        if (model.$config().errors && response.data) {
          expr(object, model.$config().errors).set(response.data);
        }
        deferred.promise.$response = response;
        deferred.reject(response);
      })
    });
  }

  // Configures a new model, updates an existing model's settings, or updates global settings
  function config(name, options) {
    if (isObject(name)) {
      extend(global, name);
      return;
    }
    var previous = (registry[name] && registry[name].$config) ? registry[name].$config() : null,
        base = extend({}, previous ? extend({}, previous) : extend({}, DEFAULTS, DEFAULT_METHODS));

    options = deepExtend(copy(base), options);

    if (!options.url) {
      options.url = global.base.replace(/\/$/, '') + '/' + hyphenate(name);
    }
    registry[name] = new ModelClass(options);
  }

  extend(this, {

    model: function(name, options) {
      config(name, options);
      return this;
    },

    // Returns the model service
    $get: ['$http', '$parse', '$q', function($http, $parse, $q) {
      q = $q;
      http = $http;

      // Extracts a value from an object based on a string expression
      expr = function(obj, path) {
        var parsed = $parse(path);

        return {
          get: function() { return parsed(obj); },
          set: function(value) { return parsed.assign(obj || {}, value); }
        };
      };

      // Adds, gets, or updates a named model configuration
      function ModelClassFactory(name, options) {
        if (!isUndef(options)) {
          return config(name, options);
        }
        return registry[name] || undefined;
      }

      ModelClassFactory.load = function(dst, promises) {
        forEach(promises, function(promise, name) {
          promise.then(function(value) {
            dst[name] = value;
          });
        });
        return q.all(promises);
      };

      return ModelClassFactory;
    }]
  });

  function ModelClass(options) {

    var scopedClassMethods = {
      $config: function() {
        return extend({}, options);
      },
      url: function() {
        return options.url;
      },
      instance: function(data) {
        options.$instance = inherit(new ModelInstance(this), options.$instance);
        options.$instance.$original = copy(data) || {};
        return inherit(options.$instance, data || {});
      },
      collection: function(data, boxElements) {
        var owner = this, collection = extend([], extend({
          $model: function() { return owner; }
        }, options.$collection));

        if (data && data.length) {
          for (var i = data.length - 1; i >= 0; i--) {
            collection.unshift(boxElements ? this.instance(data[i]) : data[i]);
          }
        }
        return collection;
      }
    };

    extend(this, scopedClassMethods, options.$class);
  }

  function ModelInstance(owner) {
    this.$model = function() { return owner; };
  }

}).directive('link', ['model', function(model) {

  return {
    restrict: 'E',
    link: function(scope, element, attrs) {
      if (attrs.rel !== "resource" || !attrs.href || !attrs.name) {
        return;
      }
      model(attrs.name, { url: attrs.href, singleton: attrs.singleton ? true : false });
    }
  };

}]);

})(window, window.angular);