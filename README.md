# node-cache-manager-fs
Node Cache Manager store for Filesystem
=======================================

The Filesystem store for the [node-cache-manager](https://github.com/BryanDonovan/node-cache-manager) module.

## Installation

```sh
npm install cache-manager-fs --save
```

## Features

* Saves anything that is `JSON.stringify`-able to disk
* limit maximum size on disk
* refill cache on startup (in case of application restart)
* "Callback"-interface style (no promises, no async)

## Usage example

Here are examples that demonstrate how to implement the Filesystem cache store.

## Single store

```javascript
// node cachemanager
var cacheManager = require('cache-manager');
// storage for the cachemanager
var fsStore = require('cache-manager-fs');
// initialize caching on disk
const diskCache = cacheManager.caching({
    store: fsStore, 
    options: {
        path: 'diskcache',          //path for cached files
        ttl: 60 * 60,               //time to life in seconds
        maxsize: 1000*1000*1000,    // max size in bytes on disk
        zip: true,                  //zip files to save diskspace (default: false)        
        preventfill:true            
    }
});

(async () => {

    await diskCache.set('key', 'value');
    console.log(await diskCache.get('key')); //"value"
    console.log(await diskCache.ttl('key')); //3600 seconds
    await diskCache.del('key');
    console.log(await diskCache.get('key')); //undefined

    console.log(await getUserCached(5)); //{id: 5, name: '...'}
    console.log(await getUserCached(5)); //{id: 5, name: '...'}

    await diskCache.reset();

    function getUserCached(userId) {
        return diskCache.wrap(userId /* cache key */, function () {
            return getUser(userId);
        });
    }

    async function getUser(userId) {
        return {id: userId, name: '...'};
    }

})();

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
