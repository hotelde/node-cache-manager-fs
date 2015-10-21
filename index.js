'use strict';

/**
 * Module dependencies
 */
var noop = function () {};
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var async = require('async');

/**
 * Export 'DiskStore'
 */

exports = module.exports = {
  create : function (args) {
	return DiskStore(args);
  }
};

/**
 * helper object with meta-informations about the cached data
 */
function MetaData()
{
	// the key for the storing
	this.key = null;
	// data to store
	this.value = null;
	// temporary filename for the cached file because filenames cannot represend urls completely
	this.filename = null;
	// expirydate of the entry
	this.expires = null;
	// size of the current entry
	this.size = null;
}

/**
 * construction of the disk storage
 */
function DiskStore(args)
{
  if (!(this instanceof DiskStore)) {
	return new DiskStore(args);
  }
  var store = this;
  var options = (args && args.options) ? args.options : {};
  // setup default values
  if (!options.path)
	options.path='cache/';
  if (!options.ttl)
	options.ttl=60;
  if (!options.maxsize)
	options.maxsize = 0;

  // check storage directory for existence (or create it)
  if (!fs.existsSync(options.path))
	fs.mkdirSync(options.path);

  store.options = options;
  store.name = 'diskstore';
  // current size of the cache
  store.currentsize = 0;
  // internal array for informations about the cached files - resists in memory
  store.collection = {};

  // fill the cache on startup with already existing files
  if (!options.preventfill)
	store.intializefill(options.fillcallback);

	return this;
}


/**
 * indicate, whether a key is cacheable
 */
DiskStore.prototype.isCacheableValue = function (value)
{
	return value !== null && value !== undefined;
};

/**
 * delete an entry from the cache
 */
DiskStore.prototype.del = function(key, fn)
{
  fn = fn || noop;
	var store = this;
  // get the metainformations for the key
	var data = store.collection[key];
	if (!data)
		return fn(null);

  store.currentsize-=data.size;

  // remove the key from the current store
  store.collection[key]=null;
	delete store.collection[key];

  // check if the filename is set
  if (!data.filename)
	return fn(null);

  // check if the file exists
  fs.exists(data.filename, function(exists)
  {
	if (!exists)
	  return fn(null);

	// delete the file
	fs.unlink(data.filename, function(err) {
	   return fn(err);
	});
  });
}

/**
 * set a key into the cache
 */
DiskStore.prototype.set = function set(key, val, options, fn) {

  if ('function' === typeof options) {
	fn = options;
	options = null;
  }
  fn = fn || noop;

  var store = this;
  // get ttl
  var ttl = (options && (options.ttl || options.ttl === 0)) ? options.ttl : store.options.ttl;

  var path = store.options.path;

  // remove the key from the cache (if it already existed, this updates also the current size of the store)
  store.del(key, function(err) {
	if (err)
	  return fn(err);

	// check used space and remove entries if we use to much space
	store.freeupspace(function() {

	  // prepare the new entry
	  var data = new MetaData();
	  data.key = key;
	  data.value = val;
	  data.expires = Date.now()+ ((ttl || 60) * 1000);
	  data.filename = path+ '/cache_'+crypto.randomBytes(4).readUInt32LE(0)+'.dat';
	  var stream = JSON.stringify(data);
	  data.size = stream.length;
	  store.currentsize+=data.size;

	  try
	  {
		// write data into the cache-file
		fs.writeFile(data.filename, stream, function(err) {
		  if (err)
			return fn(err);
		  // remove data value from memory
		  data.value = null;
		  delete data.value;
		  // place element with metainfos in internal collection
		  store.collection[data.key]=data;
		  return fn(null, val);
		});
	  }
	  catch(err)
	  {
		return fn(err);
	  }
	});
  });
}

/**
 * helper method to free up space in the cache (regarding the given spacelimit)
 */
DiskStore.prototype.freeupspace = function(fn)
{

  fn = fn || noop;
  var store = this;

  if (store.options.maxsize === 0)
	return fn(null);

  // do we use to much space? then cleanup first the expired elements
  if (store.currentsize>store.options.maxsize)
	store.cleanExpired();

  // when the spaceusage is to high, remove the oldest entries until we gain enough diskspace
  if (store.currentsize<=store.options.maxsize)
  	return fn(null);
  
	// for this we need a sorted list basend on the expire date of the entries (descending)
	var tuples = [];
	for (var key in store.collection) tuples.push([key, store.collection[key].expires]);
	tuples.sort(function(a, b) {
		a = a[1];
		b = b[1];
		return a < b ? 1 : (a > b ? -1 : 0);
	});
	
	return store.freeupspacehelper(tuples, fn);	
  
}

/**
 * freeup helper for asnyc space freeup
 */
DiskStore.prototype.freeupspacehelper = function(tuples, fn)
{	
	// check, if we have any entry to process
	if (tuples.length == 0)
		return fn(null);
	
	// get an entry from the list	
	var tuple = tuples.pop();
	var key = tuple[0];
	var store = this;
	
	// delete an entry from the store
	store.del(key, function(err) {
		
		// return when an error occures
		if (err)
		   return fn(err);
		
		// stop processing when enouth space has been cleaned up 
		if (store.currentsize<=store.options.maxsize)
			return fn(err);

		// ok - we need to free up more space							
		return store.freeupspacehelper(tuples, fn);
	});
}

/**
 * get entry from the cache
 */
DiskStore.prototype.get = function get(key, options, fn) {

  if ('function' === typeof options) {
	fn = options;
	options = null;
  }
  fn = fn || noop;

  var store = this;

  // get the metadata from the collection
  var data = store.collection[key];
  if (!data)
  {
	  // not found
	  return fn(null, null);
  }
  // found but expired
  if (data.expires < new Date())
  {
	  // delete the elemente from the store
	  store.del(key, function(err) {
		return fn(err, null);	  
	  });	  
  }
  else
  {
	// try to read the file
	try
	{
		fs.readFile(data.filename, function(err, filecontent) {
			if (err)
				return fn(err);
				
			var diskdata = JSON.parse(filecontent);
			fn(null, diskdata.value);
		});
	} catch(err)
	{
		fn(err);
	}
  }
};

/**
 * cleanup cache on disk -> delete all used files from the cache
 */
DiskStore.prototype.reset = function (key, fn) {
  var store = this;

  if ('function' === typeof key) {
	fn = key;
	key = null;
  }
  fn = fn || noop;

  if (Object.keys(store.collection).length === 0)
	fn(null);

  try
  {
	// delete special key
	if (key!=null)
	{
	  store.del(key);
	  return fn(null);
	}

	async.eachSeries(store.collection, function (elementKey, callback) {
		store.del(elementKey);
		callback();
	},function() {
		fn(null);
	});
  } catch(err)
  {
	return fn(err);
  }
}

/**
 * helper method to clean all expired files
 */
DiskStore.prototype.cleanExpired = function()
{
  var store = this;
  for (var key in store.collection)
  {
	var entry = store.collection[key];
	if (entry.expires < new Date())
	{
	  store.del(entry.key);
	}
  }
}

/**
 * clean the complete cache and all(!) files in the cache directory
 */
DiskStore.prototype.cleancache = function(fn)
{
  fn = fn || noop;
  // clean all current used files
  var store = this;
  store.reset();
  // check, if other files still resist in the cache and clean them, too
  var files = fs.readdirSync(store.options.path);
  files.map(function (file) {
	  return path.join(store.options.path, file);
  }).filter(function (file) {
	  return fs.statSync(file).isFile();
  }).forEach(function (file) {
	  fs.unlinkSync(file);
  });
  fn(null);
}

/**
 * fill the cache from the cache directory (usefull e.g. on server/service restart)
 */
DiskStore.prototype.intializefill = function(fn)
{
  fn = fn || noop;
  var store = this;
  // get the current working directory
  fs.readdir(store.options.path, function(err,files)
  {
	// get potential files from disk
	var f = files.map(function (filename) {
				return path.join(store.options.path, filename);
			}).filter(function (filename) {
				return fs.statSync(filename).isFile();
			});
	
	// use async to process the files and send a callback after completion
	async.eachSeries(f, function (filename, callback) {
	  fs.readFile(filename, function(err,data){
		// stop file processing when there was an reading error
		if (err)
		  return callback();
		try
		{
		  // get the json out of the data
		  var diskdata = JSON.parse(data);
		} catch(err)
		{
		  // when the deserialize doesn't work, probably the file is uncomplete - so we delete it and ignore the error
		  try {fs.unlinksync(filename); } catch(err){}
		  return callback();
		}
		// update the size in the metadata - this value isn't correctly stored in the file
		diskdata.size=data.length;
		// remove the entrys content - we don't want the content in the memory (only the meta informations)
		diskdata.value = null;
		delete diskdata.value;
		// and put the entry in the store
		store.collection[diskdata.key] = diskdata;
		// check for expiry - in this case we instantly delete the entry
		if (diskdata.expires < new Date())
		{
		  store.del(diskdata.key, function() {
			return callback();
		  });
		}
		else
		{
		  return callback();
		}
	  });
	}, function(err) {
	  // callback after completion
	  fn(null);
	});
  });
}