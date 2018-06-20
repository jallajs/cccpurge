# cccpurge
[![npm version][version-badge]][npm-link]
[![build status][travis-badge]][travis-link]
[![downloads][downloads-badge]][npm-link]
[![js-standard-style][standard-badge]][standard-link]

Purge Cloudflare cache of all routes served by a [Choo][choo] app. This is usefull when [enabling cache for all content](https://support.cloudflare.com/hc/en-us/articles/200172366-How-do-I-cache-everything-on-a-URL-) and you later need to purge the cache for html pages due to updated content or when publishing a new version of your app. E.g. one could use this as part of a webhook that is triggerd by changes made to a CMS or as part of a deploy script.

## Usage
You'll need to get your Cloudflare `Zone ID`, it's on the dashboard overview when signing into your Cloudflare account. Just below that is a link to get your `API key`.

```javascript
#!/usr/bin/env node

var cccpurge = require('cccpurge')

cccpurge(require('./index'), {
  root: 'https://www.my-blog.com',
  email: 'foo@my-blog.com',
  zone: '7sef78we7hwhefw3hri3uhriu32rwehf',
  key: '0046ffew5f560675hny5765r7gre6005reg05'
}, console.log)
```

### Dynamic routes
Dynamics routes (wildcards/params) are supported out of the box but you'll have to supply a function that resolves them to actual urls. The resolve function is given the route (e.g. `/posts/:post`) and a callback. How you resolve `/posts/:post` to `/post/my-first-post` is completely up to you. Here's an example using [Prismic][prismic].

```javascript
#!/usr/bin/env node

var Prismic = require('prismic-javascript')
var cccpurge = require('cccpurge')
var app = require('./index')
var opts = {
  resolve: resolve,
  root: 'https://www.my-blog.com',
  email: 'foo@my-blog.com',
  zone: '7sef78we7hwhefw3hri3uhriu32rwehf',
  key: '0046ffew5f560675hny5765r7gre6005reg05'
}

cccpurge(app, opts, done)

function done (err, response) {
  if (err) console.error(err)
  else console.log('Cache purged!')
  process.exit(0)
}

function resolve (route, done) {
  // only bother purging posts
  if (route !== '/posts/:post') return done(null)

  // fetch posts from prismic api
  Prismic.getApi('https://my-site.cdn.prismic.io/api/v2')).then(function (api) {
    return api.query(
      Prismic.Predicates.at('document.type', 'blog-post')
    ).then(function (response) {
      done(null, response.results.map((post) => `/posts/${post.uid}`))
    })
  }).catch(done)
}
```

### Limit
Cloudinary has a limit of maximum 30 urls per call to the purge endpoint. We respect that limit but it can be overridden by setting `opts.limit` to any number. Requests are made in parallel with a miximum of `limit` urls per request.

[choo]: https://github.com/choojs/choo
[prismic]: https://prismic.io

[version-badge]: https://img.shields.io/npm/v/cccpurge.svg?style=flat-square
[npm-link]: https://npmjs.org/package/cccpurge
[travis-badge]: https://img.shields.io/travis/jallajs/cccpurge/master.svg?style=flat-square
[travis-link]: https://travis-ci.org/jallajs/cccpurge
[downloads-badge]: http://img.shields.io/npm/dm/cccpurge.svg?style=flat-square
[standard-badge]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-link]: https://github.com/feross/standard
