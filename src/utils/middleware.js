const getUser = require('./mirage')

module.exports = async (req, res, next) => {
  if (req.path.startsWith('/oauth/')) {
    // ignore OAuth routes
    return next()
  }
  if (!req.session.token) {
    return res.redirect('/oauth/login')
  }
  const user = await getUser(req.session.token)
  if (!user.admin && !user.moderator) {
    delete req.session.token
    req.flash(
      'is-danger',
      'You are not an admin, you cannot access this service'
    )
    return res.redirect('/oauth/login')
  }
  res.locals.profile = user

  if (user.id === '6576549888295698432') {
    res.locals.profile.relative = true
  }

  return next()
}
