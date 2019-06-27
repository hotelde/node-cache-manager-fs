var assert = require('chai').assert;
var store = require('../index.js')
var fs = require('fs');
var path = require('path');
var uuid = require('uuid');
var cacheDirectory = 'test/customCache';

describe('test for the hde-disk-store module', function () {

	// remove test directory after run
	after(function (done) {
		// create a test store
		var s=store.create({options: {path:cacheDirectory, preventfill:true}});

		// cleanup all entries in the cache
		s.cleancache(function (err) {
			assert(err === null);
			// and remove test data directory
			setTimeout(function () {

				fs.rmdirSync(s.options.path);
				done();
			}, 100);
			});
	});

	describe('construction', function () {

		it('simple create cache test', function ()
		{
			// create a store with default values
			var s = store.create();
			// remove folder after testrun
			after(function () { fs.rmdirSync(s.options.path); });
			// check the creation result
			assert.isObject(s);
			assert.isObject(s.options);
			assert.isTrue(fs.existsSync(s.options.path));
		});

		it('create cache with option path test', function () {
			// create a store
			var s = store.create({options: {path:cacheDirectory, preventfill:true}});
			// check path option creation
			assert.isObject(s);
			assert.isObject(s.options);
			assert.isTrue(fs.existsSync(s.options.path));
			assert(s.options.path == cacheDirectory);
		});
	});

	describe('get', function () {

		it('simple get test with not existing key', function (done)
		{
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			s.get('asdf', function (err, data)
			{
				assert(data === null);
				done();
			});
		});

		describe('test missing file on disk', function() {
			it('filename empty', function (done){
				var s=store.create({options: {path:cacheDirectory, preventfill:true}});
				s.set('test','test', function (err)
				{
					assert(err === null);
					var tmpfilename = s.collection['test'].filename;
					s.collection['test'].filename = null;
					s.get('test', function (err,data) {
						assert(err !== null);
						assert(data == null);
						s.collection['test'].filename = tmpfilename;
						s.del('test', function (err)
						{
							assert(err == null);
							done();
						});
					})
				});
			});

			it('file does not exist', function (done){
				var s=store.create({options: {path:cacheDirectory, preventfill:true}});
				s.set('test','test', function (err)
				{
					assert(err === null);
					var tmpfilename = s.collection['test'].filename;
					s.collection['test'].filename = "bla";
					s.get('test', function (err,data) {
						assert(err !== null);
						assert(data == null);
						s.collection['test'].filename = tmpfilename;
						s.del('test', function (err)
						{
							assert(err == null);
							done();
						});
					})
				});
			});
		});

		it('test expired of key (and also ttl option on setting)', function (done)
		{
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			s.set('asdf','blabla', {ttl:-1000}, function (err)
			{
				assert(err === null)
				s.get('asdf',function (err,data){
					assert(err === null, 'error is not null!'+err);
					assert(data === null);
					done();
				})
			});
		})
	});

	describe('set', function () {

		it('simple set test', function (done)
		{
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			var data = 'a lot of data in a file'
			s.set('asdf',data, function (err,data2)
			{
				assert(err === null);
				assert(data2,'check if entry has been returned on insert');
				s.get('asdf', function (err, data2)
				{
					assert(data2,'check if entry could be retrieved');
					assert(data === data2);
					done();
				});
			});
		});
	});

	describe('keys', function() {

		it('simple keys test', function (done) {
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			var data = 'just a string with data';
			s.set('key123', data, function (err, data2) {
				assert(err === null);
				s.keys(function(err, keys) {
					assert(err === null);
					assert(keys.length === 1);
					assert(keys[0] === 'key123');
					done();
				});
			});
		});
	});

	describe('del / reset', function () {

		it('simple del test for not existing key', function (done)
		{
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			s.del('not existing', function (err) {
				done();
			});
		});

		it('successfull deletion', function (done)
		{
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			s.set('nix','empty', function (err) {
				assert(err === null);
				s.reset('nix', function (err) {
					done();
				});
			});
		});

		describe('delete errorhandling', function() {
			it('file not exists', function(done) {
				var s=store.create({options: {path:cacheDirectory, preventfill:true}});
				s.set('test','empty', function(err) {
					assert(err === null);
					var fn = s.collection['test'].filename;
					s.collection['test'].filename = s.collection['test'].filename+".not_here";
					s.del('test', function(err) {
						s.collection['test'].filename = fn;
						assert(err==null);
						done();
					});
				});
			});


			it('filename not set', function(done) {
				var s=store.create({options: {path:cacheDirectory, preventfill:true}});
				s.set('test','empty', function(err) {
					assert(err === null);
					var fn = s.collection['test'].filename;
					s.collection['test'].filename = null;
					s.del('test', function(err) {
						s.collection['test'].filename = fn;
						assert(err==null);
						done();
					});
				})
			});

		})

		it('reset all', function(done) {
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			s.set('test', 'test', function(err){
				assert(err === null);

				s.set('test2', 'test2', function(err) {
					assert(err === null);
					s.reset(function(err) {
						assert(err === null);

						s.keys(function(err, keys) {
							assert(err === null);
							assert(keys.length === 0);
							done();
						});
					});
				});
			});
		});

		it('reset callback', function (done)
		{
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			s.set('test','test', function (err)
			{
				assert(err === null);
				s.reset(function (error) {
					assert(err === null);
					done();
				})
			});
		});
	});

	describe('isCacheableValue', function () {

		it('works', function () {
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			assert(!s.isCacheableValue(null));
			assert(!s.isCacheableValue(undefined));
		});
	});

    describe('zip test', function() {
       it('save and load again', function(done) {
			// create store
			var s=store.create({options: {zip:true, path:cacheDirectory, preventfill:true}});
            var datastring = "bla only for test \n and so on...";
            var dataKey = "zipDataTest";
			s.set(dataKey, datastring, function (err) {
				assert(err === null);
                s.get(dataKey, function (err, data) {
                    assert(err === null);
                    assert(data == datastring);
                    done();
                });
            });
       })
    });

	describe('integrationtests', function () {

		it('cache initialization on start', function (done) {
			// create store
			var s=store.create({options: {path:cacheDirectory, preventfill:true}});
			// save element
			s.set('RestoreDontSurvive', 'data', {ttl:-1}, function (err) {
				assert(err === null);
				s.set('RestoreTest','test', function (err)
				{
					var t=store.create({options: {path:cacheDirectory, fillcallback: function () {
						//fill complete
						t.get('RestoreTest', function (err, data) {
							assert(data === 'test');
							t.get('RestoreDontSurvive', function (err,data) {
								assert(err === null);
								assert(data === null);
								assert(s.currentsize > 0, 'current size not correctly initialized - '+s.currentsize);
								done();
							});
						});
					}
					}});
				});
			});
		});

		it('max size option', function (done) {

			// create store
			var s = store.create({
				options: {
					path: cacheDirectory,
					preventfill: true,
					maxsize: 1
				}
			});

			s.set('one', 'dataone', {}, function (err, val) {
				assert(err === 'Item size too big.');
				assert(Object.keys(s.collection).length === 0);

				s.set('x', 'x', { ttl: -1 }, function (err, val) {
					assert(err === 'Item size too big.');
					assert(Object.keys(s.collection).length === 0);

					s.options.maxsize = 150;
					s.set('a', 'a', { ttl: 10000 }, function (err, val) {
						assert(err === null);
						assert(Object.keys(s.collection).length === 1);

						s.set('b', 'b', { ttl: 100 }, function (err){
							assert(err === null);

							s.set('c', 'c', { ttl: 100 }, function (err){
								assert(err === null);

								// now b should be removed from the cache, a should exists
								s.get('a', function (err, data) {
									assert(err === null);
									assert(data,'a');

									s.get('b', function (err,data){
										assert(err === null);
										assert(data === null);
										done();
									});
								});
							});
						});
					});
				});
			});
		});

        describe('can handle unexpected files in the cache directory', function () {
            var originalUUIDv4;
            var mockUUID;
            var s;

            before(function () {
                originalUUIDv4 = uuid.v4;
                uuid.v4 = function mockv4() {
                    if (mockUUID) {
                        return mockUUID
                    };
                    return originalUUIDv4();
                }
                s = store.create({ options: { path:cacheDirectory, preventfill: true } });

                // simulate cruft files that may exist in the cache directory
                fs.writeFileSync(path.join(cacheDirectory, '.DS_Store'), 'not JSON data');
            });

            afterEach(function () {
                s.cleancache();
            });

            after(function () {
                uuid.v4 = originalUUIDv4;
            })

            it('skips over non-cache files', function (done) {
                // create store and set some entries
                s.set('key0', 'data0', function (err) {

                    // ungracefully reset the cache
                    s.collection = {};
                    s.currentsize = 0;

                    s.intializefill(function (err) {
                        s.get('key0', function (err, data) {
                            assert(data === 'data0', `expected "data0", but received "${data}"`);
                            fs.readdir(cacheDirectory, function (err, files) {
                                assert(files.includes('.DS_Store'), '".DS_Store" should exist.');
                                done();
                            });
                        });
                    });
                });
            });

            it('truncated JSON files', function (done) {
                mockUUID = '8f1a33a9-9984-4e98-9c72-3bea37dab031';
                var cacheFileName = 'cache_' + mockUUID + '.dat';
                var cachedFilePath = path.join(cacheDirectory, cacheFileName);

                // set an entry
                s.set('getTruncated', 'some data...', function (err) {
                    // simulate truncated .dat file
                    var tmpData = fs.readFileSync(cachedFilePath, 'utf8');
                    fs.writeFileSync(cachedFilePath, tmpData.substring(0, 20), 'utf8');

                    // ungracefully reset the cache
                    s.collection = {};
                    s.currentsize = 0;

                    // re-init the cache from files saved in directory
                    s.intializefill(function () {
                        // Callback to run after fill has completed
                        s.get('getTruncated', function (err, data) {
                            var files = fs.readdirSync(cacheDirectory);
                            assert(data === null, `expected null but received "${data}"`);
                            assert(!files.includes(cacheFileName), `"${cacheFileName}" should not exist`);
                            done();
                        });
                    });
                });
            });
        });
	});
});
