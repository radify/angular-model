# angular-model API documentation


`model`
=======

<span class="hint">function in module `ur` </span>

Description
-----------

Main factory function for angular-model

Usage
-----

```javascript
model(name[, options]);
```

#### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">name</td>
<td align="left"><a href="">string</a></td>
<td align="left"><div class="ur-model-page ur-model-model-page">
<p>Name of the 'class', e.g. 'posts'</p>
</div></td>
</tr>
<tr class="even">
<td align="left">options
<div>
<em>(optional)</em>
</div></td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="ur-model-page ur-model-model-page">
<p>Config to initialise the model 'class' with. You can supply an object literal to configure your model here.</p>
</div></td>
</tr>
</tbody>
</table>

#### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">ur.model</a></td>
<td align="left"><div class="ur-model-page ur-model-model-page">
<p>instance of angular-model for the 'class' identified by 'name'</p>
</div></td>
</tr>
</tbody>
</table>

Example
-------

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


`$instance`
===========

<span class="hint">object in module `ur` </span>

Description
-----------

Methods available on model instances

You can use these when you have created or loaded a model instance, see the example

     var post = model('posts').first({_id: 42});
     console.log(post.name);
     => "Post with ID 42"

     post.name = 'renamed';
     post.$save();

You can specify custom instance methods:

     yourApp.config(function(modelProvider) {
       modelProvider.model('posts', {
         $instance: {
           $logo: function() {
             return this.logo || '/logos/default.png';.
           }
         }
       });
     });

Methods
-------

### $delete()

Delete an instance from the API

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="-delete-page">
<p>Promise from an API request</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    post.$delete();

### $dirty()

Returns boolean - true if a model instance is unmodified, else false. Inverse of $pristine.

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">boolean</a></td>
<td align="left"><div class="-dirty-page">
<p>true if a model instance is modified, else false. Inverse of $pristine.</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    if (post.$pristine()) { console.log('It is just as it was when we got it from the API'); }

### $exists()

Checks whether an object exists in the API, based on whether it has an identity URL.

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">boolean</a></td>
<td align="left"><div class="-exists-page">
<p>True if the identifier of this instance exists in the API</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    if (post.$exists()) { console.log('It exists'); }

### $hasRelated(name)

Does an instance have a relation of name `name`?

##### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">name</td>
<td align="left"><a href="">string</a></td>
<td align="left"><div class="-hasrelated-page">
<p>Name of the related property to check for</p>
</div></td>
</tr>
</tbody>
</table>

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">boolean</a></td>
<td align="left"><div class="-hasrelated-page">
<p>true if a $link to <code>name</code> exists on this instance</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    if (post.$hasRelated('author')) { console.log('Post has an author'); }

### $modified()

Returns a map of the properties that have been changed

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="-modified-page">
<p>Map of the fields that have been changed from the $pristine version</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    console.log(post.$modified());

### $pristine()

Returns boolean - false if a model instance is unmodified, else true. Inverse of $dirty.

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">boolean</a></td>
<td align="left"><div class="-pristine-page">
<p>true if a model instance is unmodified, else false. Inverse of $dirty.</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    if (post.$dirty()) { console.log('Post has been modified'); }

### $related()

Hydrates the $links property of the instance. $links are used so that an instance can tell the client which objects are related to it. For example, a `post` may have an `author` object related to it.

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="-related-page">
<p>Promise from the API</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    console.log(post.links());

### $reload()

Refresh an instance of a model from the API

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="-reload-page">
<p>Promise from an API request</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    post.$reload();

### $revert()

Reset the model to the state it was originally in when you first got it from the API

#### Example

    post.$revert();

### $save(data)

Persist an instance to the API

##### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">data
<div>
<em>(optional)</em>
</div></td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="-save-page">
<p>Data to save to this model instance. Defaults to the result of <code>this.$modified()</code></p>
</div></td>
</tr>
</tbody>
</table>

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="-save-page">
<p>Promise from an API request</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    var post = model('posts').create({ name: 'some post' });
    post.$save();


`$class`
========

<span class="hint">object in module `ur` </span>

Description
-----------

Methods available on the model class

Analogous to static methods in the OOP world

You can specify custom class methods:

     yourApp.config(function(modelProvider) {
       modelProvider.model('posts', {
         $class: {
           types: function() {
             return ['announcement', 'article']
           }
         }
       });
     });

Methods
-------

### all(data, headers)

Retrieve collection of post instances from the API

##### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">data
<div>
<em>(optional)</em>
</div></td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="all-page">
<p>Configuration of the request that will be sent to your API</p>
</div></td>
</tr>
<tr class="even">
<td align="left">headers
<div>
<em>(optional)</em>
</div></td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="all-page">
<p>Map of custom headers to send to your API</p>
</div></td>
</tr>
</tbody>
</table>

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="all-page">
<p>Promise from an API request</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    model('posts').all().then(function(posts) {
      console.log(posts.length);
    });
    => 4

### create(data)

Creates an instance on of the model

##### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">data
<div>
<em>(optional)</em>
</div></td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="create-page">
<p>Configuration of the instance that you are creating. Merged with any defaults specified when this model was declared.</p>
</div></td>
</tr>
</tbody>
</table>

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="create-page">
<p>angular-model instance</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    var post = model('Posts').create({});

### first(data)

Retrieve a single post instances from the API

##### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">data
<div>
<em>(optional)</em>
</div></td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="first-page">
<p>Configuration of the request that will be sent to your API</p>
</div></td>
</tr>
</tbody>
</table>

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="first-page">
<p>Promise from an API request</p>
</div></td>
</tr>
</tbody>
</table>

#### Example

    model('posts').first({name: 'some post'}).then(function(post) {
      console.log(post._id);
    });
    => 42


`$collection`
=============

<span class="hint">object in module `ur` </span>

Description
-----------

Methods available on model collections

You can use collection methods to deal with a bunch of instances together. This allows you to have powerful and expressive methods on collections.

You can specify custom collection methods:

     yourApp.config(function(modelProvider) {
       modelProvider.model('posts', {
         $collection: {
           $hasArchived: function() {
             return !angular.isUndefined(_.find(this, { archived: true }));
           }
         },
       });
     });

Methods
-------

### add(object, data)

Saves the `object` with `data`

##### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">object</td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="add-page">
<p>Object to persist data onto</p>
</div></td>
</tr>
<tr class="even">
<td align="left">data
<div>
<em>(optional)</em>
</div></td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="add-page">
<p>Data to persist onto the object</p>
</div></td>
</tr>
</tbody>
</table>

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">boolean</a></td>
<td align="left"><div class="add-page">
<p>true if a $link to <code>name</code> exists on this instance</p>
</div></td>
</tr>
</tbody>
</table>

### remove(index)

Find `index` and delete it from the API, then remove it from the collection

##### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">index</td>
<td align="left"><a href="">number</a><a href="">object</a></td>
<td align="left"><div class="remove-page">
<p>Either the index of the item in the collection to remove, or the object itself, which will be searched for in the collection</p>
</div></td>
</tr>
</tbody>
</table>

##### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="remove-page">
<p>Promise from the API</p>
</div></td>
</tr>
</tbody>
</table>


`$get`
======

<span class="hint">function in module `ur` </span>

Description
-----------

Get the model class factory

Usage
-----

```javascript
$get($http, $parse, $q);
```

#### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">$http</td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="ur-model-page ur-model--get-page">
<p><a href="https://docs.angularjs.org/api/ng/service/$http" class="uri">https://docs.angularjs.org/api/ng/service/$http</a></p>
</div></td>
</tr>
<tr class="even">
<td align="left">$parse</td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="ur-model-page ur-model--get-page">
<p><a href="https://docs.angularjs.org/api/ng/service/$parse" class="uri">https://docs.angularjs.org/api/ng/service/$parse</a></p>
</div></td>
</tr>
<tr class="odd">
<td align="left">$q</td>
<td align="left"><a href="">object</a></td>
<td align="left"><div class="ur-model-page ur-model--get-page">
<p><a href="https://docs.angularjs.org/api/ng/service/$q" class="uri">https://docs.angularjs.org/api/ng/service/$q</a></p>
</div></td>
</tr>
</tbody>
</table>

#### Returns

<table>
<colgroup>
<col width="50%" />
<col width="50%" />
</colgroup>
<tbody>
<tr class="odd">
<td align="left"><a href="">object</a></td>
<td align="left"><div class="ur-model-page ur-model--get-page">
<p>The model service</p>
</div></td>
</tr>
</tbody>
</table>


`link`
======

<span class="hint">directive in module `ur.model` </span>

Description
-----------

angular-model will scan your page looking for `<link rel="resources">` tags. It will use these to work out where your API endpoints are for your angular-model classes.

So, if you have a "class" Posts, you would define a link with an href pointing to the API endpoint for Posts. This should be a HATEOS-compliant API endpoint.

Dependencies
------------

`model`

Usage
-----

as element:
```javascript
<link
       rel="{string}"
       name="{string}"
       href="{string}">
</link>
```

#### Parameters

<table>
<colgroup>
<col width="33%" />
<col width="33%" />
<col width="33%" />
</colgroup>
<thead>
<tr class="header">
<th align="left">Param</th>
<th align="left">Type</th>
<th align="left">Details</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td align="left">rel</td>
<td align="left"><a href="">string</a></td>
<td align="left"><div class="ur-model-directive-page ur-model-directive-link-page">
<p>Must be equal to &quot;resource&quot;.</p>
</div></td>
</tr>
<tr class="even">
<td align="left">name</td>
<td align="left"><a href="">string</a></td>
<td align="left"><div class="ur-model-directive-page ur-model-directive-link-page">
<p>The name of the angular-model &quot;class&quot; to use.</p>
</div></td>
</tr>
<tr class="odd">
<td align="left">href</td>
<td align="left"><a href="">string</a></td>
<td align="left"><div class="ur-model-directive-page ur-model-directive-link-page">
<p>Where should angular-model look for the API for this resource.</p>
</div></td>
</tr>
</tbody>
</table>

Example
-------

    <html ng-app="myApp">
    <head>
        <title>My Posts Application</title>
        <link rel="resource" name="Posts" href="/api/posts">


