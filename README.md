[![Travis Status for radify/angular-model](https://travis-ci.org/radify/angular-model.svg)](https://travis-ci.org/radify/angular-model)
[![Coverage Status](https://coveralls.io/repos/radify/angular-model/badge.svg?branch=master&service=github)](https://coveralls.io/github/radify/angular-model?branch=master)
[![Dependency Status](https://david-dm.org/radify/angular-model.svg)](https://david-dm.org/radify/angular-model)
[![devDependency Status](https://david-dm.org/radify/angular-model/dev-status.svg)](https://david-dm.org/radify/angular-model#info=devDependencies)
[![Code Climate](https://codeclimate.com/github/radify/angular-model/badges/gpa.svg)](https://codeclimate.com/github/radify/angular-model)

# Angular Model

## Simple HATEOS-oriented persistence module for AngularJS.

**Angular Model** is a module that provides a simple way to bind client-side domain logic to JSON-based API resources.

By sticking to hypermedia design principles, Angular Model allows you to implement client applications that are cleanly decoupled from your server architecture.

## Basic Usage

In your AngularJS application, include the JavaScript:

```html
// your specific paths may vary
<script src="node_modules/radify/angular-model.js"></script>
```

In your app configuration, state a dependency on [Angular Model](https://github.com/radify/angular-model):

```javascript
angular.module('myApp', [
	'ur.model'
]);
```

## API documentation

The source code is documented using the ngdoc standard using [gulp-ngdocs](https://www.npmjs.com/package/gulp-ngdocs/). A markdown version is browseable at [/docs](/docs/api.md).
  
To generate documentation in HTML, run:

```bash
gulp ngdocs
```

This will output docs into the `build/docs` directory. Then, using a server like `ws`, start a local web server:

```bash
cd build/docs
npm install -g ws
ws
```

Then, you should be able to browse to http://localhost:8000 to view the API documentation for angular-model.

## Configuration

Here is a quick reference guide to all the configuration settings you can pass to the model() constructor, which is [documented in full in the API documentation](/docs/api.md). Each one is then described in detail later in this document, and in full in the source code in the `src` directory.

Setting | Type | Description
------- | ---- | -----------
url     | string | API url that this model maps to
defaults | object literal | Default values of attributes of instances of this model. Similar to properties in OOP.
$instance | object literal | Instance methods available on each instance of this model.
$class | object literal | Class methods available on this model. Similar to static methods in OOP.
$collection | object literal | Collection

### Defaults

```javascript
yourApp.config(function(modelProvider) {
    modelProvider.model('posts', {
        /**
         * @ngdoc object
         * @name yourApp.posts.defaults
         * @description
         * Configure the default attributes for instances of posts.
         *
         * This is similar to an OOP class, which has attributes with defaults, e.g. "public string foo = 'bar';"
         */
        defaults: {
            name: '',         // The name of the post
            published: false, // Whether the post has been released to the general public
            body: '',         // Body text of this post
            logo: null,       // The logo to show for this post
            author: 'John Doe'// Who wrote the post?
        }
    });
});
```

Here is an example of how the defaults get used:

```javascript
var post = model('posts').create({});
console.log(post.author);
=> John Doe
```

## Creating instances of your model

You can use angular-model ad-hoc to construct object instances:

```javascript
// From defaults
var post = model('posts').create({});

// Specifying fields
var post = model('posts').create({
  name: 'some post',
  body: "body of some body, it's just some body, you know?",
  author: 'Steve Davis'
});

console.log(post.author);
=> Steve Davis
```

## Instance Methods

angular-model instances have instance methods, similar to objects in the OOP world.

### Default instance methods

The following methods are available to every angular-model instance.

Function | Description
------- | -----------
$save | Persist an instance to the API
$delete | Tell the API to delete an instance
$reload | Refresh an instance of a model from the API
$revert | Reset the model to the state it was originally in when you first got it from the API
$exists | Checks whether an object exists in the API, based on whether it has an identity URL.
$dirty | Returns boolean - true if a model instance has been modified, else false. Opposite of $pristine.
$pristine | Returns boolean - true if a model instance has unmodified, else false. Opposite of $dirty.
$related | Hydrates the $links property of the instance. $links are used so that an instance can tell the client which objects are related to it. For example, a `post` may have an `author` object related to it.
$modified | Returns a map of the properties that have been changed
$hasRelated | Does an instance have a relation of name `name`?

> You can see full details of these methods in the [API documentation](/docs/api.md).

### Custom instance methods

angular-model allows you to define instance methods on instances. This is similar to adding methods by extending a base class in the OOP world.

```javascript
yourApp.config(function(modelProvider) {
    modelProvider.model('posts', {
        // ...

        /**
         * @ngdoc object
         * @name yourApp.posts.$instance
         * @description
         * Instance methods that are callable on any individual instance of a post
         */
        $instance: {
            /**
             * @ngdoc function
             * @name yourApp.posts.$logo
             * @description
             * If this post instance has a logo, return it, otherwise return a default string
             *
             * @return string Either the logo for this post, or a default logo
             */
            $logo: function() {
                return this.logo || '/logos/default.png';.
            }
        }
    });
});
```

Example:

```javascript
var post = model('Posts').create({
  logo: 'foo.png'
});
console.log(post.$logo());
=> foo.png
```

## Class methods

### Default class methods

The following methods are available statically to angular-model:

Function | Description
-------- | -----------
all | Make a request to the API, based on the `url` configuration setting
first | Given a query, get the first model instance from the API
create | Create a new instance of the model. Defaults come from the `defaults` configuration setting.

> You can see full details of these methods in the [API documentation](/docs/api.md).

### Custom class methods

angular-model allows you to define class methods on instances. This is similar to static methods in the OOP world.

```javascript
yourApp.config(function(modelProvider) {
    modelProvider.model('posts', {
        // ...

        /**
         * @ngdoc object
         * @name yourApp.posts.$class
         * @description
         * Class methods that are callable on the posts class, or any instance thereof. These
         * behave similarly to static methods in OOP languages.
         */
        $class: {
            /**
             * @ngdoc function
             * @name yourApp.posts.roles
             * @description
             * Get an array of valid post types.
             *
             * @return array The valid types that a post can have. Array of strings
             */
            types: function() {
                return ['announcement', 'article']
            }
        }
    });
});
```

Example:

```javascript
console.log(model('Posts').types());
=> ['announcement', 'article']
```

## Collection methods

You can use collection methods as well, so you can deal with a bunch of instances together. This allows you to have powerful and expressive methods on collections.

### Default collection methods

The following methods are available statically to angular-model:

Function | Description
-------- | -----------
add | Saves the `object` with `data`
remove | Find `index` and delete it from the API, then remove it from the collection

> You can see full details of these methods in the [API documentation](/docs/api.md).

### Custom collection methods

```javascript
yourApp.config(function(modelProvider) {
    modelProvider.model('posts', {
        // ...

        /**
         * @ngdoc object
         * @name yourApp.posts.$collection
         * @description
         * Methods that apply to a collection of posts together
         */
        $collection: {
            /**
             * @ngdoc function
             * @name yourApp.posts.$hasArchived
             * @description
             * Operates on a collection of posts and determines whether any of them are archived
             *
             * @requires _ Lodash library is used to search the collection
             *
             * @return string Either the logo for this post, or a default logo
             */
            $hasArchived: function() {
                return !angular.isUndefined(_.find(this, { archived: true }));
            }
        }
    });
});
```

Example:

```javascript
model('Posts').all().then(function(posts) {
  if (posts.$hasArchived()) {
    // Some of the posts in the collection are archived
  }
});
```

Running unit tests
--

Install the test runner with npm:

```bash
npm install
```

You can then run the tests with gulp:

```bash
gulp
```

Tests can be found in the `spec` directory of this project.

Related
--

You may wish to use [Angular Scaffold](https://github.com/radify/angular-scaffold/), which is is a collection of convenience wrappers around angular-model collections. Really helpful for building your AngularJS application with angular-model.
