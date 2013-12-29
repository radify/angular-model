describe("model", function() {

  var provider;

  beforeEach(module("ur.model", function(modelProvider) {
    provider = modelProvider;
  }));

  describe("provider", function() {

    describe("configuration", function() {
      it("should accept definitions", inject(function() {
        expect(provider.model("Projects", {})).toBe(provider);
      }));

      it("should not wrongly overwrite default configuration", inject(function(model) {
        provider.model("Lists", {
          url: "http://api/lists"
        }).model("Items", {
          url: "http://api/items"
        });

        expect(model("Lists").url()).toBe("http://api/lists");
        expect(model("Items").url()).toBe("http://api/items");
      }));
    });

    it("should be undefined for undefined models", inject(function(model) {
      expect(model("Foo")).toBeUndefined();
    }));

    it("should auto-generate a URL for new models", inject(function(model) {
      provider.model("ListItems", {});
      expect(model("ListItems").url()).toBe("/list-items");
    }));

    it("shouldn't allow configuration properties to be overwritten", inject(function(model) {
      provider.model("ListItems", { url: "/foo" });
      model("ListItems").$config().url = "/bar";
      expect(model("ListItems").url()).toBe("/foo");
    }));
  });

  describe("service", function() {

    var $httpBackend;

    beforeEach(module(function() {
      provider.model("Users", {
        defaults: { username: "anon" },
        url: "http://api/users"
      }).model("Projects", {
        $instance: {
          poster: function() {
            return this.$links.logo || "/img/placeholder/poster.gif";
          },
          fileName: function() {
            var i = this.name.lastIndexOf('_');
            return (i !== -1) ? this.name.substring(i + 1) : this.name;
          }
        },
        defaults: {
          name: "New Project",
          $links: {}
        },
        url: "http://api/projects"
      }).model("Tasks", {
        url: "http://api/tasks"
      });
    }));

    beforeEach(inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
    }));

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it("should allow late-binding of requests", inject(function(model) {
      model("Sessions", {
        url: "http://api/sessions",
        defaults: { id: 12345 }
      });
      expect(model("Sessions").create().id).toBe(12345);
    }));

    it("should create objects with configured default values", inject(function(model) {
      var newProject = model("Projects").create();
      expect(JSON.stringify(newProject)).toEqual('{"name":"New Project","$links":{}}');

      var newUser = model("Users").create();
      expect(JSON.stringify(newUser)).toBe('{"username":"anon"}');
    }));

    it("should invoke instance methods with the correct binding", inject(function(model) {
      var Projects = model("Projects"), customVal = "/img/my-project.png";
      expect(Projects.create().poster()).toEqual("/img/placeholder/poster.gif");
      expect(Projects.create({ $links: { logo: customVal }}).poster()).toEqual(customVal);
    }));

    it("should create new objects with a POST request", inject(function(model) {
      $httpBackend.expectPOST('http://api/projects', JSON.stringify({
        name: "My Project",
        verified: true
      })).respond(201, JSON.stringify({
        name: "My Project",
        archived: false,
        $links: { self: "http://api/projects/1138" }
      }));

      var newProject = model("Projects").create({ name: "My Project" });

      newProject.$save({ verified: true }).then(function(result) {
        expect(result).toBe(newProject);
      });
      expect(newProject.$links.self).toBeUndefined();
      expect(newProject.archived).toBeUndefined();

      $httpBackend.flush();
      expect(newProject.$links.self).toBe("http://api/projects/1138");
      expect(newProject.archived).toBe(false);
      expect(newProject.verified).toBe(true);
    }));

    it("should update existing objects with a PATCH request", inject(function(model) {
      var url = "http://api/projects/1138", doc = {
        name: "My Project",
        verified: true,
        archived: false
      }, update = angular.extend({}, doc, { archived: true });

      $httpBackend.expectPATCH(url, JSON.stringify(update)).respond(200, JSON.stringify(update));

      var existingProject = model("Projects").instance(angular.extend({ $links: { self: url } }, doc));

      existingProject.$save({ archived: true }).then(function(result) {
        expect(result).toBe(existingProject);
      });

      $httpBackend.flush();

      expect(existingProject.name).toBe("My Project");
      expect(existingProject.$links.self).toBe("http://api/projects/1138");
      expect(existingProject.archived).toBe(true);
    }));

    it("should return arrays boxed as collections", inject(function(model) {
      var data = [
        { name: "First Project", $links: { self: "http://api/projects/1138" }},
        { name: "Second Project", $links: { self: "http://api/projects/1139" }}
      ];
      $httpBackend.expectGET("http://api/projects").respond(200, JSON.stringify(data));

      model("Projects").all().then(function(result) {
        expect(angular.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        expect(result.$model().url()).toBe("http://api/projects");
      });
      $httpBackend.flush();
    }));

    it("should accept query parameters", inject(function(model) {
      var success, data = { success: true };
      $httpBackend.expectGET("http://api/projects?q=some%20search").respond(200, JSON.stringify(data));

      model("Projects").all({ q: "some search" }).then(function(result) {
        success = result;
      });
      $httpBackend.flush();
      expect(success.success).toBe(true);
    }));

    it("should correctly append query parameters", inject(function(model) {
      var success, data = { success: true };
      provider.model('Search', { url: 'http://api/search?hl=en' });
      $httpBackend.expectGET("http://api/search?hl=en&q=some%20search").respond(200, JSON.stringify(data));

      model("Search").all({ q: "some search" }).then(function(result) {
        success = result;
      });
      $httpBackend.flush();
      expect(success.success).toBe(true);
    }));

    it("should accept custom headers", inject(function(model) {
      var success, data = { success: true };
      $httpBackend.expectGET("http://api/projects", {
        "Accept": "application/json, text/plain, */*",
        "x-some-header": "foo"
      }).respond(200, JSON.stringify(data));

      model("Projects").all(null, {
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
            projects = [{ name: "Project 1" }, { name: "Project 2" }],
            tasks = [{ name: "Task 1" }, { name: "Task 2" }];

        $httpBackend.expectGET("http://api/projects").respond(200, JSON.stringify(projects));
        $httpBackend.expectGET("http://api/tasks").respond(200, JSON.stringify(tasks));

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

    describe("class methods", function() {
      describe("first()", function() {
        it("should return the first element of an array", inject(function(model) {
          var data = [
            { name: "First Project", $links: { self: "http://api/projects/1138" }},
            { name: "Second Project", $links: { self: "http://api/projects/1139" }}
          ];
          $httpBackend.expectGET("http://api/projects").respond(200, JSON.stringify(data));
    
          model("Projects").first().then(function(result) {
            expect(result.name).toBe("First Project");
          });
          $httpBackend.flush();
        }));

        it("should return the full result of non-array responses", inject(function(model) {
          var data = { name: "A Project", $links: { self: "http://api/projects/a" }};
          $httpBackend.expectGET("http://api/projects").respond(200, JSON.stringify(data));
    
          model("Projects").first().then(function(result) {
            expect(result.name).toBe("A Project");
            expect(result.$links.self).toBe("http://api/projects/a");
          });
          $httpBackend.flush();
        }));

        it("should passthru query parameters", inject(function(model) {
          var first, data = { name: "First Project", $links: { self: "http://api/projects/first" }};
          $httpBackend.expectGET("http://api/projects?first=true").respond(200, JSON.stringify(data));

          model("Projects").first({ first: true }).then(function(result) {
            first = result;
          });
          $httpBackend.flush();

          expect(first.name).toBe("First Project");
          expect(first.$links.self).toBe("http://api/projects/first");
        }));
      });
    });

    describe("errors", function() {
      it("should populate on failed request", inject(function(model) {
        var user, response, id = "http://api/users/5", errors = {
          email: [
            "E-mail cannot be empty.",
            "E-mail is not valid.",
            "Sorry, this e-mail address is already registered."
          ],
          passwordConfirm: "Your passwords must match."
        };

        $httpBackend.expectPATCH(id).respond(422, JSON.stringify(errors));

        user = model('Users').create({ $links: { self: id }});

        user.$save().then(angular.noop, function(resp) {
          response = resp;
        });
        expect(user.$errors).toBeUndefined();

        $httpBackend.flush();
        expect(response.status).toBe(422);
        expect(JSON.stringify(user.$errors)).toEqual(JSON.stringify(errors));
      }));

      it("should handle a failed request to GET all", inject(function(model) {
        $httpBackend.expectGET('http://api/users').respond(404, []);

        users = model('Users').all();

        $httpBackend.flush();
      }));
    });
  });
});
