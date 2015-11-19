describe('model', function() {

  var provider;

  beforeEach(module('ur.model', function(modelProvider) {
    provider = modelProvider;
  }));

  beforeEach(function() {
    jasmine.addMatchers({
      toEqualData: function() {
        return {
          compare: function(actual, expected) {
            return {pass: angular.equals(actual, expected)};
          }
        };
      }
    });
  });

  describe('provider', function() {

    describe('configuration', function() {
      it('should accept definitions', inject(function() {
        expect(provider.model('Projects', {})).toBe(provider);
      }));

      it('should not wrongly overwrite default configuration', inject(function(model) {
        provider.model('Lists', {
          url: 'http://api/lists'
        }).model('Items', {
          url: 'http://api/items'
        });

        expect(model('Lists').url()).toBe('http://api/lists');
        expect(model('Items').url()).toBe('http://api/items');
      }));
    });

    it('should be undefined for undefined models', inject(function(model) {
      expect(model('Foo')).toBeUndefined();
    }));

    it('should auto-generate a URL for new models', inject(function(model) {
      provider.model('ListItems', {});
      expect(model('ListItems').url()).toBe('/list-items');
    }));

    it('shouldn\'t allow configuration properties to be overwritten', inject(function(model) {
      provider.model('ListItems', {url: '/foo'});
      model('ListItems').$config().url = '/bar';
      expect(model('ListItems').url()).toBe('/foo');
    }));
  });

  describe('service', function() {

    var $httpBackend;

    beforeEach(module(function() {
      provider.model('Users', {
        defaults: {username: 'anon'},
        url: 'http://api/users',
        $instance: {
          isAdmin: function() {
            return this.roles.indexOf('admin') > -1;
          }
        }
      }).model('Projects', {
        $instance: {
          poster: function() {
            return this.$links.logo || '/img/placeholder/poster.gif';
          },
          fileName: function() {
            var i = this.name.lastIndexOf('_');
            return (i !== -1) ? this.name.substring(i + 1) : this.name;
          }
        },
        defaults: {
          name: 'New Project',
          $links: {}
        },
        url: 'http://api/projects'
      }).model('Tasks', {
        url: 'http://api/tasks'
      }).model('Messages', {
        url: 'http://api/messages'
      });
    }));

    beforeEach(inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
    }));

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('should allow late-binding of requests', inject(function(model) {
      model('Sessions', {
        url: 'http://api/sessions',
        defaults: {id: 12345}
      });
      expect(model('Sessions').create().id).toBe(12345);
    }));

    it('should create objects with configured default values', inject(function(model) {
      var newProject = model('Projects').create();
      expect(newProject).toEqualData({name: 'New Project', $links: {}});

      var newUser = model('Users').create();
      expect(newUser).toEqualData({username: 'anon'});
    }));

    it('should invoke instance methods with the correct binding', inject(function(model) {
      var Projects = model('Projects'), customVal = '/img/my-project.png';
      expect(Projects.create().poster()).toEqual('/img/placeholder/poster.gif');
      expect(Projects.create({$links: {logo: customVal}}).poster()).toEqual(customVal);
    }));

    it('should determine if a relation exists', inject(function(model) {
      var project = model('Projects').create({
        $links: {
          self: {href: 'http://api/projects/10'},
          owner: {href: 'http://api/users/1', name: 'Users'}
        }
      });

      expect(project.$hasRelated('owner')).toBe(true);
      expect(project.$hasRelated('watcher')).toBe(false);
    }));

    it('should load related instances by name', inject(function(model) {
      var project = model('Projects').create({
        $links: {
          self: {href: 'http://api/projects/10'},
          owner: {href: 'http://api/users/1', name: 'Users'}
        }
      });

      project.$related('owner');
      $httpBackend.expectGET('http://api/users/1').respond({
        $links: {self: {href: 'http://api/users/1'}}
      });
      $httpBackend.flush();
    }));

    it('should throw an error if relation does not exist', inject(function(model) {
      var project = model('Projects').create({
        $links: {
          self: {href: 'http://api/projects/10'},
          owner: {href: 'http://api/users/1', name: 'Users'}
        }
      });

      var fn = function() {
        project.$related('foo');
      };

      expect(fn).toThrow(new Error('Relation `foo` does not exist.'));
      $httpBackend.verifyNoOutstandingRequest();
    }));

    it('should box relations according to name', inject(function(model) {
      var project = model('Projects').create({
        $links: {
          self: {href: 'http://api/projects/10'},
          owner: {href: 'http://api/users/1', name: 'Users'}
        }
      });

      var owner = project.$related('owner').then(function(owner) {
        expect(owner.isAdmin).toEqual(jasmine.any(Function));
      });
      $httpBackend.expectGET('http://api/users/1').respond({
        $links: {self: {href: 'http://api/users/1', name: 'Users'}}
      });
      $httpBackend.flush();
    }));

    it('should create new objects with a POST request', inject(function(model) {
      $httpBackend.expectPOST('http://api/projects', JSON.stringify({
        name: 'My Project',
        $links: {},
        verified: true
      })).respond(201, JSON.stringify({
        name: 'My Project',
        archived: false,
        $links: {self: {href: 'http://api/projects/1138', name: 'Projects'}}
      }));

      var newProject = model('Projects').create({name: 'My Project'});

      newProject.$save({verified: true}).then(function(result) {
        expect(result).toBe(newProject);
      });
      expect(newProject.$links.self).toBeUndefined();
      expect(newProject.archived).toBeUndefined();

      $httpBackend.flush();
      expect(newProject.$links.self.href).toBe('http://api/projects/1138');
      expect(newProject.archived).toBe(false);
      expect(newProject.verified).toBe(true);
    }));

    it('should update existing objects with a PATCH request', inject(function(model) {
      var url = 'http://api/projects/1138', doc = {
        name: 'My Project',
        verified: true,
        archived: false
      }, update = angular.extend({}, doc, {archived: true});

      $httpBackend.expectPATCH(url, JSON.stringify({archived: true})).respond(200, JSON.stringify(update));

      var existingProject = model('Projects').instance(angular.extend({
        $links: {self: {href: url,}}
      }, doc));

      existingProject.$save({archived: true}).then(function(result) {
        expect(result).toBe(existingProject);
      });

      $httpBackend.flush();

      expect(existingProject.name).toBe('My Project');
      expect(existingProject.$links.self.href).toEqual('http://api/projects/1138');
      expect(existingProject.archived).toBe(true);
    }));

    it('should return arrays boxed as collections', inject(function(model) {
      var data = [
        {name: 'First Project', $links: {self: {href: 'http://api/projects/1138'}}},
        {name: 'Second Project', $links: {self: {href: 'http://api/projects/1139'}}}
      ];
      $httpBackend.expectGET('http://api/projects').respond(200, JSON.stringify(data));

      model('Projects').all().then(function(result) {
        expect(angular.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        expect(result.$model().url()).toBe('http://api/projects');
      });
      $httpBackend.flush();
    }));

    it('should attach and correctly bind custom collection methods', inject(function(model) {
      provider.model('Objects', {
        $collection: {
          count: function() {
            return this.length;
          }
        }
      });

      $httpBackend.expectGET('/objects').respond(200, JSON.stringify([{}, {}, {}, {}]));

      model('Objects').all().then(function(collection) {
        expect(collection.count()).toBe(4);
      });
      $httpBackend.flush();
    }));

    it('should accept query parameters', inject(function(model) {
      var success, data = {success: true};
      $httpBackend.expectGET('http://api/projects?q=some%20search').respond(200, JSON.stringify(data));

      model('Projects').all({q: 'some search'}).then(function(result) {
        success = result;
      });
      $httpBackend.flush();
      expect(success.success).toBe(true);
    }));

    it('should correctly append query parameters', inject(function(model) {
      var success, data = {success: true};
      provider.model('Search', {url: 'http://api/search?hl=en'});
      $httpBackend.expectGET('http://api/search?hl=en&q=some%20search').respond(200, JSON.stringify(data));

      model('Search').all({q: 'some search'}).then(function(result) {
        success = result;
      });
      $httpBackend.flush();
      expect(success.success).toBe(true);
    }));

    it('should accept custom headers', inject(function(model) {
      var success, data = {success: true};
      $httpBackend.expectGET('http://api/projects', {
        'Accept': 'application/json, text/plain, */*',
        'x-some-header': 'foo'
      }).respond(200, JSON.stringify(data));

      model('Projects').all(null, {
        'x-some-header': 'foo'
      }).then(function(result) {
        success = result;
      });
      $httpBackend.flush();
      expect(success.success).toBe(true);
    }));

    describe('load()', function() {
      it('should map promise resolution values to object attributes asynchronously', inject(function(model) {
        var scope = {},
            projects = [{name: 'Project 1'}, {name: 'Project 2'}],
            tasks = [{name: 'Task 1'}, {name: 'Task 2'}];

        $httpBackend.expectGET('http://api/projects').respond(200, JSON.stringify(projects));
        $httpBackend.expectGET('http://api/tasks').respond(200, JSON.stringify(tasks));

        model.load(scope, {
          projects: model('Projects').all(),
          tasks: model('Tasks').all()
        }).then(function() {
          scope.done = true;
        });
        expect(scope.projects).toBeUndefined();
        expect(scope.tasks).toBeUndefined();
        expect(scope.done).toBeUndefined();

        $httpBackend.flush(1);
        expect(JSON.stringify(scope.projects)).toBe(JSON.stringify(projects));
        expect(scope.tasks).toBeUndefined();
        expect(scope.done).toBeUndefined();

        $httpBackend.flush();
        expect(JSON.stringify(scope.tasks)).toBe(JSON.stringify(tasks));
        expect(scope.done).toBe(true);
      }));
    });

    describe('class methods', function() {
      describe('first()', function() {
        it('should return the first element of an array', inject(function(model) {
          var data = [
            {name: 'First Project', $links: {self: {href: 'http://api/projects/1138'}}},
            {name: 'Second Project', $links: {self: {href: 'http://api/projects/1139'}}}
          ];
          $httpBackend.expectGET('http://api/projects').respond(200, JSON.stringify(data));

          model('Projects').first().then(function(result) {
            expect(result.name).toBe('First Project');
          });
          $httpBackend.flush();
        }));

        it('should return the full result of non-array responses', inject(function(model) {
          var data = {name: 'A Project', $links: {self: {href: 'http://api/projects/a'}}};
          $httpBackend.expectGET('http://api/projects').respond(200, JSON.stringify(data));

          model('Projects').first().then(function(result) {
            expect(result.name).toBe('A Project');
            expect(result.$links.self.href).toBe('http://api/projects/a');
          });
          $httpBackend.flush();
        }));

        it('should passthru query parameters', inject(function(model) {
          var first, data = {name: 'First Project', $links: {self: {href: 'http://api/projects/first'}}};
          $httpBackend.expectGET('http://api/projects?first=true').respond(200, JSON.stringify(data));

          model('Projects').first({first: true}).then(function(result) {
            first = result;
          });
          $httpBackend.flush();

          expect(first.name).toBe('First Project');
          expect(first.$links.self.href).toBe('http://api/projects/first');
        }));
      });
    });

    describe('errors', function() {
      it('should populate on failed request', inject(function(model) {
        var user, response, id = 'http://api/users/5', errors = {
          email: [
            'E-mail cannot be empty.',
            'E-mail is not valid.',
            'Sorry, this e-mail address is already registered.'
          ],
          passwordConfirm: 'Your passwords must match.'
        };

        $httpBackend.expectPATCH(id).respond(422, JSON.stringify(errors));

        user = model('Users').create({$links: {self: {href: id}}});

        user.$save({name: 'test'}).then(angular.noop, function(resp) {
          response = resp;
        });
        expect(user.$errors).toBeUndefined();

        $httpBackend.flush();
        expect(response.status).toBe(422);
        expect(JSON.stringify(user.$errors)).toEqual(JSON.stringify(errors));
      }));

      it('should handle a failed request to GET all', inject(function(model) {
        $httpBackend.expectGET('http://api/users').respond(404, []);

        users = model('Users').all();

        $httpBackend.flush();
      }));
    });

    describe('dirty checking', function() {
      var user;

      beforeEach(inject(function(model) {
        user = model('Users').instance({
          $links: {self: {href: 'http://api/users/100'}},
          _id: 100,
          name: 'Some Person',
          role: 'User',
          telephone: {
            home: '1234',
            office: '5678'
          }
        });
      }));

      it('should tell if a value has changed', function() {
        expect(user.$dirty()).toBe(false);
        expect(user.$pristine()).toBe(true);

        user.name = 'Some other person';

        expect(user.$dirty()).toBe(true);
        expect(user.$pristine()).toBe(false);
      });

      it('should tell if a value is added', function() {
        expect(user.$dirty()).toBe(false);
        expect(user.$pristine()).toBe(true);

        user.email = 'test@test.com';

        expect(user.$dirty()).toBe(true);
        expect(user.$pristine()).toBe(false);
      });

      it('should tell if a nested object has changed', function() {
        expect(user.$dirty()).toBe(false);
        expect(user.$pristine()).toBe(true);

        user.telephone.office = '91011';

        expect(user.$dirty()).toBe(true);
        expect(user.$pristine()).toBe(false);
      });

      it('should revert to original state', function() {
        user.name = 'Some other person';
        user.telephone.office = '91011';

        user.$revert();

        expect(user.$dirty()).toBe(false);

        var reverted = angular.extend({}, user, {
          _id: 100,
          name: 'Some Person',
          role: 'User',
          telephone: {
            home: '1234',
            office: '5678'
          }
        });

        expect(angular.equals(reverted, user)).toBe(true);
        expect(user.$original().telephone).not.toBe(user.telephone);
      });

      it('should return new and modified fields', function() {
        angular.extend(user, {
          name: 'New name',
          role: 'Admin',
          telephone: {
            office: '91011'
          },
          email: 'test@test.com'
        });

        expect(user.$modified()).toEqual({
          name: 'New name',
          role: 'Admin',
          telephone: {
            office: '91011'
          },
          email: 'test@test.com'
        });
      });

      it('should only PATCH new and modified fields', function() {
        angular.extend(user, {
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123'
          },
          email: 'test@test.com'
        });

        user.$save();

        $httpBackend.expectPATCH('http://api/users/100', {
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123'
          },
          email: 'test@test.com'
        }).respond(200);
        $httpBackend.flush();
      });

      it('should update original state on successful save', function() {
        angular.extend(user, {
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123'
          },
          newObj: {
            foo: 'bar'
          }
        });

        user.$save();

        $httpBackend.expectPATCH('http://api/users/100', {
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123'
          },
          newObj: {
            foo: 'bar'
          }
        }).respond(200, {
          $links: {
            self: {
              href: 'http://api/users/100'
            }
          },
          _id: 100,
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123',
            office: '5678'
          },
          newObj: {
            foo: 'bar'
          }
        });

        $httpBackend.flush();

        expect(user.$pristine()).toBe(true);
        expect(user.$dirty()).toBe(false);
        expect(user.$modified()).toEqual({});

        expect(user.$original().newObj).not.toBe(user.newObj);
        expect(user.$original().telephone).not.toBe(user.telephone);
      });

      it('should preserve modified state on failed save', function() {
        angular.extend(user, {
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123'
          }
        });

        user.$save();

        $httpBackend.expectPATCH('http://api/users/100', {
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123'
          }
        }).respond(500);

        $httpBackend.flush();

        expect(user.$pristine()).toBe(false);
        expect(user.$dirty()).toBe(true);
        expect(user.$modified()).toEqual({
          name: 'Newman',
          role: 'Intern',
          telephone: {
            home: '0123'
          }
        });
      });

      it('should skip PATCH for an umodified instance and resolve immediately', function() {
        user.$save().then(function(resp) {
          expect(resp).toEqualData(user);
        });

        $httpBackend.verifyNoOutstandingRequest();
      });

      it('should ignore dirty fields when saving a new instance', inject(function(model) {
        var admin = model('Users').create({
          username: 'Mr Admin',
          role: 'Admin'
        });

        admin.$save();

        $httpBackend.expectPOST('http://api/users', {
          username: 'Mr Admin',
          role: 'Admin'
        }).respond(100);
        $httpBackend.flush();
      }));

      it('should push updates to arrays', inject(function(model) {
        var list = model('Tasks').create({things: []});

        list.$save();

        $httpBackend.expectPOST('http://api/tasks', {
          things: []
        }).respond(201, {
          things: [],
          $links: {self: {href: 'http://api/tasks/1138'}}
        });

        $httpBackend.flush();

        list.things = ['foo', 'bar'];
        list.$save();

        $httpBackend.expectPATCH('http://api/tasks/1138', {
          things: ['foo', 'bar']
        }).respond(200, {
          things: ['foo', 'bar']
        });

        $httpBackend.flush();

        expect(list.things).toEqualData(['foo', 'bar']);
        expect(list.$pristine()).toBe(true);

        list.things.pop();
        expect(list.$pristine()).toBe(false);
        list.$save();

        $httpBackend.expectPATCH('http://api/tasks/1138', {
          things: ['foo']
        }).respond(200, {
          things: ['foo']
        });

        $httpBackend.flush();

        expect(list.things).toEqualData(['foo']);
        expect(list.$pristine()).toBe(true);
      }));

      it('should not choke on null values in arrays', inject(function(model) {
        var data = {foo: 'bar'};

        model('Tasks').create(data).$save();

        $httpBackend.expectPOST('http://api/tasks', data).respond(200, angular.extend(
          {baz: ['gooby', null]}, data
        ));
        $httpBackend.flush();
      }));
    });

    describe('$delete()', function() {
      it('erases the object form the API', inject(function(model) {

        var selfurl = 'http://api/users/5';
        var user = model('Users').create({$links: {self: {href: selfurl}}});

        $httpBackend.expectDELETE(selfurl).respond(204);

        user.$delete();

        $httpBackend.flush();
      }));
    });

    describe('syncing', function() {
      it('should correctly update local copy on successful save', inject(function(model) {
        var message = model('Messages').create({
          from: 'http://api/users/13',
          content: 'Hello!'
        });

        message.$save();

        $httpBackend.expectPOST('http://api/messages', {
          from: 'http://api/users/13',
          content: 'Hello!'
        }).respond(201, {
          content: 'Hello!',
          from: {
            name: 'Bob',
            $links: {self: {href: 'http://api/users/13'}}
          }
        });
        $httpBackend.flush();

        expect(message.from).toEqualData({
          name: 'Bob',
          $links: {self: {href: 'http://api/users/13'}}
        });
      }));
    });

    describe('$collection', function() {
      beforeEach(function() {
        var data = [
          {name: 'First Project', $links: {self: {href: 'http://api/projects/1138'}}},
          {name: 'Second Project', $links: {self: {href: 'http://api/projects/1139'}}}
        ];
        $httpBackend.expectGET('http://api/projects').respond(200, JSON.stringify(data));
      });

      describe('add()', function() {
        it('adds a new model instance to the API', inject(function(model) {
          $httpBackend.expectPOST('http://api/projects/1140').respond(201);

          model('Projects').all().then(function(result) {
            var data = {name: 'Third Project', $links: {self: {href: 'http://api/projects/1140'}}};
            var newItem = model('Projects').create({});
            result.add(newItem, data);
          });
          $httpBackend.flush();
        }));
      });

      describe('remove()', function() {
        it('removes items from the API and from the cache', inject(function(model) {
          $httpBackend.expectDELETE('http://api/projects/1138').respond(204);

          model('Projects').all().then(function(result) {
            expect(result.length).toEqual(2);
            result.remove(0).then(function() {
              expect(result.length).toEqual(1);
            });
          });
          $httpBackend.flush();
        }));
      });
    });
  });

  describe('directive', function() {

    var $httpBackend;

    beforeEach(inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
    }));

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    describe('link directive', function() {
      var elm, scope;

      describe('when a relation, resource and href are provided', function() {
        beforeEach(inject(function($rootScope, $compile) {
          elm = angular.element('<link rel=\'resource\' name=\'Messages\' href=\'/api-of-your-system/Messages\'>');

          scope = $rootScope;

          $compile(elm)(scope);
          scope.$digest();
        }));

        it('assigns the model\'s URL from the href attribute', inject(function(model) {
          var message = model('Messages').create({
            content: 'Hello!'
          });

          message.$save();

          $httpBackend.expectPOST('/api-of-your-system/Messages').respond(201);
          $httpBackend.flush();
        }));
      });

      describe('when rel !== resource', function() {
        beforeEach(inject(function($rootScope, $compile) {
          elm = angular.element('<link rel=\'other\' name=\'Messages\' href=\'/api-of-your-system/Messages\'>');

          scope = $rootScope;

          $compile(elm)(scope);
          scope.$digest();
        }));

        it('is ignored', inject(function(model) {
          expect(model('Messages')).toBeUndefined();
        }));
      });

    });
  });

});
