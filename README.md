# node-cache-manager-fs
Node Cache Manager store for Filesystem
=======================================

The Filesystem store for the [node-cache-manager](https://github.com/BryanDonovan/node-cache-manager) module.

Installation
------------

```sh
npm install cache-manager-fs --save
```

Usage examples
--------------

Here are examples that demonstrate how to implement the Filesystem cache store.


## Features

* limit maximum size on disk
* refill cache on startup (in case of application restart)

## Single store

```javascript
// node cachemanager
var cacheManager = require('cache-manager');
// storage for the cachemanager
var fsStore = require('cache-manager-fs');
// initialize caching on disk
var diskCache = cacheManager.caching({store: fsStore, options: {ttl: 60*60 /* seconds */, maxsize: 1000*1000*1000 /* max size in bytes on disk */, path:'diskcache', preventfill:true}});
```

### Options

options for store initialization

```javascript

options.ttl = 60; // time to life in seconds
options.path = 'cache/'; // path for cached files
options.preventfill = false; // prevent filling of the cache with the files from the cache-directory
options.fillcallback = null; // callback fired after the initial cache filling is completed
options.zip = false; // if true the cached files will be zipped to save diskspace
options.reviveBuffers = true; // if true buffers are returned from cache as buffers, not objects

```
## Installation

    npm install cache-manager-fs
	
## Tests

To run tests:

npm test

## Code Coverage

To run Coverage:

npm run coverage

## License

cache-manager-fs is licensed under the MIT license.
