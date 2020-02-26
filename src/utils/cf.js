const cf = require('cloudflare')({
  email: process.env.CF_AUTH_EMAIL,
  key: process.env.CF_AUTH_KEY
})
module.exports = cf
