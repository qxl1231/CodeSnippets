#Constructing a promise

function readFile(filename, enc){
  return new Promise(function (fulfill, reject){
    fs.readFile(filename, enc, function (err, res){
      if (err) reject(err);
      else fulfill(res);
    });
  });
}



#Awaiting a promise

function readJSON(filename){
  return new Promise(function (fulfill, reject){
    readFile(filename, 'utf8').done(function (res){
      try {
        fulfill(JSON.parse(res));
      } catch (ex) {
        reject(ex);
      }
    }, reject);
  });
}


#Transformation / Chaining

function readJSON(filename){
  return readFile(filename, 'utf8').then(function (res){
    return JSON.parse(res)
  })
}
Since JSON.parse is just a function, we could re-write this as:

function readJSON(filename){
  return readFile(filename, 'utf8').then(JSON.parse);
}


#Implementations / Polyfills
Promises are useful both in node.js and the browser

jQuery
This feels like a good time to warn you that what jQuery calls a promise is in fact totally different to what everyone else calls a promise. jQuery's promises have a poorly thought out API that will likely just confuse you. Fortunately, instead of using jQuery's strange version of a promise, you can just convert it to a really simple standardised promise:

var jQueryPromise = $.ajax('/data.json');
var realPromise = Promise.resolve(jQueryPromise);
//now just use `realPromise` however you like.
Browser
Promises are currently only supported by a pretty small selection of browsers (see kangax compatibility tables). The good news is that they're extremely easy to polyfill (minified / unminified):

<script src="https://www.promisejs.org/polyfills/promise-7.0.4.min.js"></script>
None of the browsers currently support Promise.prototype.done so if you want to use that feature, and you are not including the polyfill above, you must at least include this polyfill (minified / unminified):

<script src="https://www.promisejs.org/polyfills/promise-done-7.0.4.min.js"></script>
Node.js
It's generally not seen as good practice to polyfill things in node.js. Instead, you're better off just requiring the library wherever you need it.

To install promise run:

npm install promise --save
Then you can load it into a local variable using "require"

var Promise = require('promise');
The "promise" library also provides a couple of really useful extensions for interacting with node.js

var readFile = Promise.denodeify(require('fs').readFile);
// now `readFile` will return a promise rather than expecting a callback

function readJSON(filename, callback){
  // If a callback is provided, call it with error as the first argument
  // and result as the second argument, then return `undefined`.
  // If no callback is provided, just return the promise.
  return readFile(filename, 'utf8').then(JSON.parse).nodeify(callback);
}
