const express = require('express'),
  expressEjsLayouts = require('express-ejs-layouts'),
  authMiddleware = require('./utils/middleware'),
  session = require('express-session'),
  Redis = require('redis'),
  { join } = require('path'),
  ms = require('ms')

const RedisStore = require('connect-redis')(session),
  app = express()

app.set('view engine', 'ejs')
app.set('views', join(__dirname, 'views'))
app.use(expressEjsLayouts)
app.set('layout', 'layouts/layout')
app.set('layout extractScripts', true)
app.set('layout extractStyles', true)
app.set('layout extractMetas', true)

app.use(
  session({
    cookie: {
      maxAge: ms('12 hours')
    },
    store: new RedisStore({
      client: Redis.createClient({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10)
      })
    }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    unset: 'destroy'
  })
)
app.enable('trust proxy')

app.use(express.static(join(__dirname, 'static')))
app.use((req, res, next) => {
  req.flash = (clazz, message) => {
    req.session.flashes = req.session.flashes || []
    req.session.flashes.push({ class: clazz, message })
  }
  // banners
  res.locals.banners = []

  if (req.session.flashes) {
    res.locals.banners = res.locals.banners.concat(req.session.flashes)
    req.session.flashes = undefined
  }

  //Active path classes and screenreader functions on res.locals
  res.locals.activePath = path => req.path == path

  res.locals.activePathIdx = path => req.path.indexOf(path) != -1

  res.locals.activePathSw = path => req.path.startsWith(path)

  res.locals.activePathBu = path => req.baseUrl === path

  res.locals.originalUrl = path =>
    req.originalUrl.startsWith(path) ? 'is-active' : ''

  res.locals.originalUrlEq = path =>
    req.originalUrl === path ? 'is-active' : ''

  res.locals.nbPath = path => (res.locals.activePath(path) ? 'is-active' : '')

  res.locals.nbSwPath = path =>
    res.locals.activePathSw(path) ? 'is-active' : ''

  res.locals.nbBuPath = path =>
    res.locals.activePathBu(path) ? 'is-active' : ''

  res.locals.mask = string => {
    let regex = new RegExp(`(${process.env.CF_AUTH_EMAIL})`, 'gi')
    let regex2 = new RegExp(process.env.MIRAGE_BACKENDIP, 'gi')
    let regex3 = new RegExp(process.env.MIRAGE_FORUMSIP, 'gi')

    return string
      .replace(regex, '******************')
      .replace(regex2, '<em>* backend ip *</em>')
      .replace(regex3, '<em>* community/forums ip *</em>')
  }

  return next()
})
app.use(authMiddleware)

app.use('/oauth', require('./routes/OAuthRouter'))
app.use('/domains', require('./routes/DomainsRouter'))
app.get('/', (req, res) => {
  res.render('pages/index')
})

module.exports = app
