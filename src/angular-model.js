(function(window, angular, undefined) {
'use strict';

var noop     = angular.noop,
	forEach  = angular.forEach,
	extend   = angular.extend,
	copy     = angular.copy,
	isFunc   = angular.isFunction,
	isObject = angular.isObject,
	isArray  = angular.isArray


function underscore(str) {
	var toLower = function($1) { return "_" + $1.toLowerCase(); };
	return str.replace(/([A-Z])/g, toLower).replace(/^_+/, '');
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

	// Used to evaluate expressions; initialized by the service invokation
	var expr;

	// "Box" an object value in a model instance if it is present.
	// Otherwise, return an empty model object.
	function autoBox(config, object, data) {
		return data ? config.box(object, data) : object;
	}

	// Box an array of JSON objects into a model collection
	function boxArray(object, data) {
		object.length = object.length || 0;

		forEach(data, function(item) {
			object.push(Model.create(item));
		});
		return object;
	}

	// Global registry of settings
	var global = {

		// Base URL prepended to generated URLs
		base: null,

		// Extract URL from object, or use default URL
		url: function(config, object) {
			return object instanceof Model ? expr(object, config.identity) || this.url : this.url;
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
		errors: "$errors",

		// Object boxing function
		box: function(object, data) {
			return isArray(object) ? boxArray(object, data) : copy(data, object);
		}
	};

	var DEFAULT_METHODS = {

		// Methods available on the model class
		$class {
			find: function(data) {
				return $factory.request(config.actions.apply('collection', []), 'GET', data);
			},
			create: function(data) {
				return this.instance(extend({}, defaults, data || {}));
			},
			instance: function(data) {
				return new ModelInstance(data);
			}
		},

		// Methods available on model instances
		$instance: {
			$save: function(data) {
				var method = this.$exists() ? 'PATCH' : 'POST';
				return $factory.request(extend(this, data || {}), method, this);
			},
			$delete: function() {
				return $factory.request(this, 'DELETE');
			},
			$reload: function() {
				return $factory.request(this, 'GET');
			},
			$revert: function() {
				// @todo Reset to previously loaded state
			},
			$exists: function() {
				return !!expr(this, config.identity);
			}
		},

		// Methods available on model collections
		$collection: {
			add: function(object) {
				var self = this;
				return object.$save().success(function() { self.push(object); });
			},
			remove: function(index) {
				index = (typeof index !== 'number') ? index = this.indexOf(index) : index;

				var self = this;
				return self[index].$delete().success(function() { self.splice(index, 1); });
			}
		}
	};

	// Configures a new model, updates an existing model's settings, or updates global settings
	function config(model, options) {
		if (isObject(model)) {
			extend(global, model);
			return;
		}
		if (!options) {
			return registry[model];
		}
		registry[model] = new Model(extend(registry[model] || DEFAULTS, options));

		if (!registry[model].url) {
			registry[model].url = global.base + underscore(model);
		}

		forEach(DEFAULT_METHODS, function(val, key) {
			if (isFunc(val)) {
				return registry[model][key] = options[key] || key;
			}
			registry[model][key] = extend(val, options[key] || {});
		});

		return this;
	}

	extend(this, {

		// Used to add named model configurations, or set global configuration
		config: function(model, options) {
			return config.apply(this, model, options);
		},

		// Returns the model service
		$get: ['$http', '$parse', function($http, $parse) {

			// Extracts a value from an object based on a string expression
			expr = function(obj, path) {
				return $parse(path)(obj);
			};

			return extend(this, {
				config: function(model, options) {
					return config.apply(this, model, options);
				},
				get: function(model) {
					return registry[model];
				}
			});
		}]
	});

	function ModelFactory(name, config) {

		var $factory = {

			request: function(object, method, data, headers) {
				var params = {
					method: method,
					url: this.url(object),
					data: data,
					headers: headers || {}
				};

				if (method === 'PATCH') {
					extend(params.headers, { 'Content-Type': 'application/json;charset=UTF-8' });
				}
				var deferred = $q.defer(), promise = deferred.promise;

				$http(params).then(function(resp) {
					resp.data = (resp.data) ? config.autoBox(object, resp.data) : object;
					deferred.resolve(resp);
				}, function(reason) {
					object[config.errorsKey] = reason.data;
					deferred.reject(reason);
				});

				return extend(object, {
					$success: function(callback) {
						promise.then(function(resp) {
							callback(resp.data, resp.headers);
						});
						return this;
					},

					$error: function(callback) {
						promise.then(null, function(resp) {
							callback(resp);
						});
						return this;
					},

					$then: promise.then
				});
			}
		};

		function Model(data) {
			copy(data || {}, this);
		}

		return Model;
	}

	return ModelFactory;

}).directive('link', ['model', function(model) {

	return {
		restrict: 'E',
		link: function(scope, element, attrs) {
			if (attrs.rel !== "resource" || !attrs.href || !attrs.name) {
				return;
			}
			// model.config(attrs.name, { url: attrs.href });
		}
	};

}]);

})(window, window.angular);