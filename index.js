var url = require('url')
var https = require('https')
var assert = require('assert')
var map = require('async/map')
var parallel = require('async/parallel')
var getAllRoutes = require('wayfarer/get-all-routes')

module.exports = cccpurge

function cccpurge (app, opts, callback) {
  assert(isChooApp(app), 'cccpurge: app should be an instance of a choo app')
  assert(typeof opts === 'object', 'cccpurge: opts should be an object')
  assert(typeof callback === 'function', 'cccpurge: callback should be a function')
  assert(typeof opts.zone === 'string', 'cccpurge: opts.zone should be a string')
  assert(typeof opts.email === 'string', 'cccpurge: opts.email should be a string')
  assert(typeof opts.key === 'string', 'cccpurge: opts.key should be a string')

  var limit = opts.limit || 30
  var router = app.router.router

  map(Object.keys(getAllRoutes(router)), resolveRoute, function (err, routes) {
    if (err) return callback(err)

    // flatten list and filter out any falsy values
    var initial = Array.isArray(opts.urls) ? opts.urls : [opts.urls]
    routes = flatten(routes, initial).filter(Boolean).map(resolveRoot)

    if (routes.length <= limit) {
      purgeUrls(routes, callback)
    } else {
      var batches = []
      while (routes.length) {
        batches.push(routes.splice(0, limit))
      }

      // run purge in parallel with `limit` urls per job
      parallel(batches.map(function (batch) {
        return purgeUrls.bind(undefined, batch)
      }), callback)
    }
  })

  // handle route with partials
  // (str, fn) -> void
  function resolveRoute (route, done) {
    if (!/\/:/.test(route)) return done(null, route)
    assert(opts.resolve, 'cccpurge: opts.resolve should be a function')
    opts.resolve(route, done)
  }

  // resolve route relative to root
  // (str|obj) -> any
  function resolveRoot (route) {
    if (!route || !opts.root) {
      return typeof route === 'string' ? route.replace(/\/$/, '') : route
    }

    if (route.url) {
      route.url = url.resolve(opts.root, route.url).replace(/\/$/, '')
      return route
    }

    return url.resolve(opts.root, route).replace(/\/$/, '')
  }

  // purge cloudflare cache for given urls
  // (str, fn) -> void
  function purgeUrls (urls, done) {
    var req = https.request({
      hostname: 'api.cloudflare.com',
      port: 443,
      path: '/client/v4/zones/' + opts.zone + '/purge_cache',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Email': opts.email,
        'X-Auth-Key': opts.key
      }
    }, function onresponse (res) {
      if (res.statusCode >= 400) return done(new Error(res.statusMessage))
      var body = ''
      res.on('data', function (chunk) {
        body += chunk
      })
      res.on('end', function () {
        done(null, JSON.parse(body))
      })
    })

    req.on('error', done)
    req.write(JSON.stringify({files: urls}))
    req.end()
  }
}

// check wether thing is an instance of a choo app
// obj -> bool
function isChooApp (app) {
  return Boolean(app &&
    app.router &&
    app.router.router &&
    app.router.router._trie)
}

// flatten array
// (arr, initial?) -> arr
function flatten (arr, initial) {
  initial = initial || []
  return arr.reduce(function (flat, value) {
    return flat.concat(value)
  }, initial)
}
