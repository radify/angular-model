/**
 * AngularJS API Domain Model Service
 *
 * {@copyright 2015, Radify, Inc (http://radify.io/)}
 * {@link https://github.com/radify/angular-model#readme}
 *
 * @license BSD-3-Clause
 */
(function(window, angular, undefined) {
'use strict';

var forEach = angular.forEach,
  extend   = angular.extend,
  copy     = angular.copy,
  isFunc   = angular.isFunction,
  isObject = angular.isObject,
  isArray  = angular.isArray,
  isUndef  = angular.isUndefined,
  equals   = angular.equals;

function lisObject(thing) {
  return thing && thing.constructor && thing.constructor === Object;
}

function deepExtend(dst, source) {
  for (var prop in source) {
    if (source[prop] && lisObject(source[prop])) {
      dst[prop] = dst[prop] || {};

      if (lisObject(dst[prop])) {
        deepExtend(dst[prop], source[prop]);
        continue;
      }
    } else if (isArray(source[prop])) {
      dst[prop] = [];
      for (var i = 0; i < source[prop].length; i++) {
        var item = source[prop][i];
        if (lisObject(item)) {
          dst[prop].push(deepExtend({}, item));
        } else if (isArray(item)) {
          dst[prop].push(deepExtend([], item));
        } else {
          dst[prop].push(source[prop][i]);
        }
      }
      continue;
    }
    dst[prop] = source[prop];
  }
  return dst;
}

function isEmpty(obj) {
  var name;
  for (name in obj) {return false;}
  return true;
}

function inherit(parent, extra) {
  return extend(new (extend(function() {}, {prototype: parent}))(), extra);
}

function hyphenate(str) {
  var toLower = function($1) { return '-' + $1.toLowerCase(); };
  return str.replace(/([A-Z])/g, toLower).replace(/^-+/, '');
}

function serialize(obj, prefix) {
  var str = [];
  var enc = encodeURIComponent;
  var k, v;

  for (var p in obj) {
    k = prefix ? prefix + '[' + p + ']' : p;
    v = obj[p];
    str.push(isObject(v) ? serialize(v, k) : enc(k) + '=' + enc(v));
  }
  return str.join('&');
}

/**
 * @ngdoc overview
 * @name ur.model
 * @requires angular
 * @requires window
 * @description
 * Simple HATEOS-oriented persistence module for AngularJS.
 *
 * Angular Model is a module that provides a simple way to bind client-side domain logic to JSON-based API resources
 *
 * By sticking to hypermedia design principles, Angular Model allows you to implement client applications that are
 * cleanly decoupled from your server architecture.
 *
 * angular-model allows you to perform CRUD against an API in a manner similar to Active Record.
 *
 * In your AngularJS application, include the JavaScript:
 ```html
  // your specific paths may vary
  <script src="node_modules/radify/angular-model.js"></script>
  ```
 *
 * In your app configuration, state a dependency on Angular Model:

 ```javascript
 angular.module('myApp', [
 'ur.model'
 ]);
 ```
 */
angular.module('ur.model', []).provider('model', function() {

  var expr, // Used to evaluate expressions; initialized by the service invokation
      http, // Provider-level copy of $http service
      q;    // Provider-level copy of $q service

  // 'Box' an object value in a model instance if it is present.
  // Otherwise, return an empty model object.
  function autoBox(object, model, data) {
    if (!object) {
      return isArray(data) ? model.collection(data, true) : model.instance(data);
    }
    if (isArray(data) && isArray(object)) {
      return model.collection(data, true);
    }
    if (data && JSON.stringify(data).length > 3) {
      deepExtend(object, data);
      object.$original.sync(data);
    }
    return object;
  }

  // Global registry of settings
  var global = {

    // Base URL prepended to generated URLs
    base: '',

    // Extract URL from object, or use default URL
    url: function(object) {
      if (object instanceof ModelClass) {
        return object.url();
      }
      if (object instanceof ModelInstance || isFunc(object.$model)) {
        var model = object.$model();
        return expr(object, model.$config().identity + '.href').get() || model.url();
      }
      throw new Error('Could not get URL for ' + typeof object);
    },
  };

  // Master registry of application model configurations
  var registry = {};

  // Default configuration for new model classes
  var DEFAULTS = {

    // Default values which should be applied when creating a new model instance
    defaults: {},

    // The name of the key that identifies the object
    identity: '$links.self',

    // The name of the key to assign an object map of errors
    errors: '$errors'
  };

  var DEFAULT_METHODS = {

    /**
     * @ngdoc object
     * @name ur.model:$class
     * @description
     * Methods available on the model class
     *
     * Analogous to static methods in the OOP world
     *
     * You can specify custom class methods:
     *
     yourApp.config(function(modelProvider) {
       modelProvider.model('posts', {
         $class: {
           types: function() {
             return ['announcement', 'article']
           }
         }
       });
     });
     */
    $class: {
      /**
       * @ngdoc function
       * @name all
       * @methodOf ur.model:$class
       * @param {object=} data Configuration of the request that will be sent to your API
       * @param {object=} headers Map of custom headers to send to your API
       *
       * @description
       * Retrieve collection of post instances from the API
       * @example
       ```
       model('posts').all().then(function(posts) {
         console.log(posts.length);
       });
       => 4
       ```
       * @returns {object} Promise from an API request
       */
      all: function(data, headers) {
        return $request(null, this, 'GET', data, headers);
      },

      /**
       * @ngdoc function
       * @name first
       * @methodOf ur.model:$class
       * @param {object=} data Configuration of the request that will be sent to your API
       *
       * @description
       * Retrieve a single post instances from the API
       * @example
       ```
       model('posts').first({name: 'some post'}).then(function(post) {
         console.log(post._id);
       });
       => 42
       ```
       * @returns {object} Promise from an API request
       */
      first: function(data) {
        return this.all(data).then(function(response) {
          return angular.isArray(response) ? response[0] : response;
        }, function() {
          return null;
        });
      },

      /**
       * @ngdoc function
       * @name create
       * @methodOf ur.model:$class
       * @param {object=} data Configuration of the instance that you are creating. Merged with any defaults
       *   specified when this model was declared.
       *
       * @description
       * Creates an instance on of the model
       *
       * @example
       ```
       var post = model('Posts').create({});
       ```
       * @returns {object} angular-model instance
       */
      create: function(data) {
        return this.instance(deepExtend(copy(this.$config().defaults), data || {}));
      },
    },

    /**
     * @ngdoc object
     * @name ur.model:$instance
     * @description
     * Methods available on model instances
     *
     * You can use these when you have created or loaded a model instance, see the example
     *
     var post = model('posts').first({_id: 42});
     console.log(post.name);
     => "Post with ID 42"

     post.name = 'renamed';
     post.$save();
     *
     * You can specify custom instance methods:
     *
     yourApp.config(function(modelProvider) {
       modelProvider.model('posts', {
         $instance: {
           $logo: function() {
             return this.logo || '/logos/default.png';.
           }
         }
       });
     });
     */
    $instance: {
      /**
       * @ngdoc function
       * @name $save
       * @methodOf ur.model:$instance
       * @description
       * Persist an instance to the API
       * @example
       ```
       var post = model('posts').create({ name: 'some post' });
       post.$save();
       ```
       * @param {object=} data Data to save to this model instance. Defaults to the result of `this.$modified()`
       * @returns {object} Promise from an API request
       */
      $save: function(data) {
        var method, requestData;

        if (this.$exists()) {
          method = 'PATCH';
          requestData = data ? copy(data) : this.$modified();
        } else {
          method = 'POST';
          requestData = deepExtend(this, data ? copy(data) : {});
        }

        if (equals({}, requestData)) {
          return q.when(this);
        }

        return $request(this, this.$model(), method, requestData);
      },

      /**
       * @ngdoc function
       * @name $delete
       * @methodOf ur.model:$instance
       * @description
       * Delete an instance from the API
       * @example
       ```
       post.$delete();
       ```
       * @returns {object} Promise from an API request
       */
      $delete: function() {
        return $request(this, this.$model(), 'DELETE');
      },

      /**
       * @ngdoc function
       * @name $reload
       * @methodOf ur.model:$instance
       * @description
       * Refresh an instance of a model from the API
       * @example
       ```
       post.$reload();
       ```
       * @returns {object} Promise from an API request
       */
      $reload: function() {
        return $request(this, this.$model(), 'GET');
      },

      /**
       * @ngdoc function
       * @name $revert
       * @methodOf ur.model:$instance
       * @description
       * Reset the model to the state it was originally in when you first got it from the API
       * @example
       ```
       post.$revert();
       ```
       */
      $revert: function() {
        var original = copy(this.$original());

        for (var prop in this) {
          if (isFunc(this[prop])) {
            continue;
          }

          this[prop] = original[prop];
        }
      },

      /**
       * @ngdoc function
       * @name $exists
       * @methodOf ur.model:$instance
       * @description
       * Checks whether an object exists in the API, based on whether it has an identity URL.
       * @example
       ```
       if (post.$exists()) { console.log('It exists'); }
       ```
       * @returns {boolean} True if the identifier of this instance exists in the API
       */
      $exists: function() {
        return !!expr(this, this.$model().$config().identity).get();
      },

      /**
       * @ngdoc function
       * @name $dirty
       * @methodOf ur.model:$instance
       * @description
       * Returns boolean - true if a model instance is unmodified, else false. Inverse of $pristine.
       * @example
       ```
       if (post.$pristine()) { console.log('It is just as it was when we got it from the API'); }
       ```
       * @returns {boolean} true if a model instance is modified, else false. Inverse of $pristine.
       */
      $dirty: function() {
        return !this.$pristine();
      },

      /**
       * @ngdoc function
       * @name $pristine
       * @methodOf ur.model:$instance
       * @description
       * Returns boolean - false if a model instance is unmodified, else true. Inverse of $dirty.
       * @example
       ```
       if (post.$dirty()) { console.log('Post has been modified'); }
       ```
       * @returns {boolean} true if a model instance is unmodified, else false. Inverse of $dirty.
       */
      $pristine: function() {
        return equals(this, this.$original());
      },

      /**
       * @ngdoc function
       * @name $modified
       * @methodOf ur.model:$instance
       * @description
       * Returns a map of the properties that have been changed
       * @example
       ```
       console.log(post.$modified());
       ```
       * @returns {object} Map of the fields that have been changed from the $pristine version
       */
      $modified: function() {
        var original = this.$original(), diff = {};

        for (var prop in this) {
          if (isFunc(this[prop])) {
            continue;
          }

          if (!equals(this[prop], original[prop])) {
            diff[prop] = this[prop];
          }
        }

        return diff;
      },

      /**
       * @ngdoc function
       * @name $related
       * @methodOf ur.model:$instance
       * @description
       * Hydrates the $links property of the instance. $links are used so that an instance
       * can tell the client which objects are related to it. For example, a `post` may have an
       * `author` object related to it.
       * @example
       ```
       console.log(post.links());
       ```
       * @returns {object} Promise from the API
       */
      $related: function(name) {
        var link, model, instance;

        if (!this.$hasRelated(name)) {
          throw new Error('Relation `' + name + '` does not exist.');
        }

        link = this.$links[name];
        model = registry[link.name];
        if (!model) {
          throw new Error('Relation `' + name + '` with model `' + link.name + '` is not defined.');
        }

        instance = model.create();
        expr(instance, model.$config().identity).set(link);

        return instance.$reload();
      },

      /**
       * @ngdoc function
       * @name $hasRelated
       * @methodOf ur.model:$instance
       * @param {string} name Name of the related property to check for
       * @description
       * Does an instance have a relation of name `name`?
       * @example
       ```
       if (post.$hasRelated('author')) { console.log('Post has an author'); }
       ```
       * @returns {boolean} true if a $link to `name` exists on this instance
       */
      $hasRelated: function(name) {
        return isObject(this.$links[name]);
      }
    },

    /**
     * @ngdoc object
     * @name ur.model:$collection
     * @description
     * Methods available on model collections
     *
     * You can use collection methods to deal with a bunch of instances together. This allows you to have powerful
     * and expressive methods on collections.
     *
     * You can specify custom collection methods:
     *
     yourApp.config(function(modelProvider) {
       modelProvider.model('posts', {
         $collection: {
           $hasArchived: function() {
             return !angular.isUndefined(_.find(this, { archived: true }));
           }
         },
       });
     });
     */
    $collection: {
      /**
       * @ngdoc function
       * @name add
       * @methodOf ur.model:$collection
       * @param {object} object Object to persist data onto
       * @param {object=} data Data to persist onto the object
       * @description
       * Saves the `object` with `data`
       * @returns {boolean} true if a $link to `name` exists on this instance
       */
      add: function(object, data) {
        return object.$save(data || {});
      },

      /**
       * @ngdoc function
       * @name remove
       * @methodOf ur.model:$collection
       * @param {(number|object)} index Either the index of the item in the collection to remove, or the object
       *     itself, which will be searched for in the collection
       * @description
       * Find `index` and delete it from the API, then remove it from the collection
       * @returns {object} Promise from the API
       */
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
    var defaultHeaders = {'Content-Type': 'application/json;charset=UTF-8'};
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
    /**
     * @ngdoc function
     * @name ur.model:model
     * @param {string} name Name of the 'class', e.g. 'posts'
     * @param {object=} options Config to initialise the model 'class' with. You can supply an object literal to
     *     configure your model here.
     * @description
     * Main factory function for angular-model
     *
     * @example
     ```
     yourApp.config(function(modelProvider) {
       modelProvider.model('posts', {
         // configuration options
         $instance: {
           // custom instance functions
         },
         $class: {
           // custom class functions
         },
         $collection: {
           // custom collection functions
         }
       });
     });
     ```
     * @returns {ur.model} instance of angular-model for the 'class' identified by 'name'
     */
    model: function(name, options) {
      config(name, options);
      return this;
    },

    /**
     * @ngdoc function
     * @name ur.model:$get
     * @description
     * Get the model class factory
     *
     * @param {object} $http https://docs.angularjs.org/api/ng/service/$http
     * @param {object} $parse https://docs.angularjs.org/api/ng/service/$parse
     * @param {object} $q https://docs.angularjs.org/api/ng/service/$q
     * @return {object} The model service
     */
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
        options.$instance = inherit(new ModelInstance(this, copy(data) || {}), options.$instance);
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

  function ModelInstance(owner, original) {
    var self = this;
    this.$model = function() { return owner; };
    this.$original = function() { return original; };
    this.$original.sync = function(data) {
      original = deepExtend(original, data);
    };
  }

})

/**
 * @ngdoc directive
 * @name ur.model.directive:link
 * @element link
 * @restrict 'E'
 * @param {string} rel Must be equal to "resource".
 * @param {string} name The name of the angular-model "class" to use.
 * @param {string} href Where should angular-model look for the API for this resource.
 * @description
 * angular-model will scan your page looking for `<link rel="resources">` tags. It will use these
 * to work out where your API endpoints are for your angular-model classes.
 *
 * So, if you have a "class" Posts, you would define a link with an href pointing to the API endpoint
 * for Posts. This should be a HATEOS-compliant API endpoint.
 *
 * @requires ur.model
 *
 * @example
 ```html
 <html ng-app="myApp">
 <head>
     <title>My Posts Application</title>
     <link rel="resource" name="Posts" href="/api/posts">
 ```
 */
.directive('link', ['model', function(model) {
  return {
    restrict: 'E',
    link: function(scope, element, attrs) {
      if (attrs.rel !== 'resource' || !attrs.href || !attrs.name) {
        return;
      }
      model(attrs.name, {url: attrs.href, singleton: attrs.singleton ? true : false});
    }
  };

}]);

})(window, window.angular);
