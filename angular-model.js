(function(window, angular, undefined) {
'use strict';

function underscore(str) {
	var toLower = function($1) { return "_" + $1.toLowerCase(); };
	return str.replace(/([A-Z])/g, toLower).replace(/^_+/, '');
}

function serialize(obj, prefix) {
	var str = [];
	var enc = encodeURIComponent;

	for (var p in obj) {
		var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
		str.push(typeof v === "object" ? serialize(v, k) : enc(k) + "=" + enc(v));
	}
	return str.join("&");
}


angular.module('ur.model', ['ng']).factory('model', ['$http', '$parse', '$q', function($http, $parse, $q) {

	var noop = angular.noop,
		forEach = angular.forEach,
		extend = angular.extend,
		copy = angular.copy,
		isFunction = angular.isFunction,
		expr = function(obj, path) {
			return $parse(path)(obj);
		};


	function ModelFactory(name, config) {

		var DEFAULTS = {
			actions: {
				model: {},
				instance: {},
				collection: {},
				apply: function(type, object, prefix) {
					for (var n in this[type]) {
						object[(prefix || '') + n] = this[type][n];
					}
					return object;
				}
			},
			defaults: {},
			links: {},
			query: {},
			url: null,
			urlKey: "$links.self",
			errorsKey: "$errors",
			autoBox: function(object, data) {
				var it = function(item) { object.push(Model.create(item)); };
				var iterate = function() { object.length = 0; forEach(data, it); return object; }
				return angular.isArray(object) ? iterate() : copy(data, object);
			}
		};

		var $factory = {

			config: function(name, actions) {
				config = extend({}, DEFAULTS, config || {});

				for (var n in actions) {
					config.actions[n] = extend({}, actions[n], config.actions[n]);
				}
				// @todo Remove $.base dependency
				config.url = config.url || $.base + underscore(name);
				return config;
			},

			url: function(object) {
				var url = config.url;
				return object instanceof Model ? expr(object, config.urlKey) || url : url;
			},

			request: function(object, method, data, headers) {
				var params = {
					method: method, url: this.url(object), data: data, headers: headers || {}
				};

				if (method === 'PATCH') {
					angular.extend(params.headers, {
						'Content-Type': 'application/json;charset=UTF-8'
					});
				}

				var deferred = $q.defer(), promise = deferred.promise;

				$http(params).then(function(resp) {
					resp.data = (resp.data) ? config.autoBox(object, resp.data) : object;
					deferred.resolve(resp);
				}, function(reason) {
					object[config.errorsKey] = reason.data;
					deferred.reject(reason);
				});

				object.success = function(callback) {
					promise.then(function(resp) {
						callback(resp.data, resp.headers);
					});
					return this;
				};

				object.error = function(callback) {
					promise.then(null, function(resp) {
						callback(resp);
					});
					return this;
				};
				return object;
			}
		};

		$factory.config(name, {
			'class': {
				'find': function(data) {
					return $factory.request(config.actions.apply('collection', []), 'GET', data);
				}
			},
			'instance': {
				'save': function(data) {
					return $factory.request(
						extend(this, data || {}), this.$exists() ? 'PATCH' : 'POST', this
					);
				},
				'delete': function() {
					return $factory.request(this, 'DELETE');
				},
				'reload': function() {
					return $factory.request(this, 'GET');
				},
				'exists': function() {
					return !!expr(this, config.urlKey);
				}
			},
			'collection': {
				'add': function(object) {
					var self = this;
					return object.$save().success(function() { self.push(object); });
				},
				'remove': function(index) {
					index = (typeof index !== 'number') ? index = this.indexOf(index) : index;

					var self = this;
					return self[index].$delete().success(function() { self.splice(index, 1); });
				}
			}
		});

		function Model(data) {
			copy(data || {}, this);
		}

		Model.create = function(data) {
			return new this(data);
		};

		config.actions.apply('class', Model);
		config.actions.apply('instance', Model.prototype, '$');

		return Model;
	}

	return ModelFactory;
}]);

})(window, window.angular);