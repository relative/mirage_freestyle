const express = require('express'),
  getUser = require('../utils/mirage')

const OAuthRouter = express.Router()

OAuthRouter.route('/login').get((req, res) => {
  res.render('pages/oauth/jail', {
    layout: 'layouts/oauth'
  })
})

OAuthRouter.route('/login/mirage').get((req, res) => {
  res.redirect(
    `${process.env.MIRAGE_BASEURL}/oauth/tempauth?client_id=freestyle&redirect_uri=${process.env.BASEURL}/oauth/redirect/mirage`
  )
})

OAuthRouter.route('/redirect/mirage').get(async (req, res) => {
  const user = await getUser(req.query.token)
  if (!user) {
    req.flash('is-danger', 'Invalid token received from Mirage, try again')
    return res.redirect('/oauth/login')
  }
  console.log(user)
  if (!user.admin) {
    req.flash(
      'is-danger',
      'You are not an admin, you cannot access this service'
    )
    return res.redirect('/oauth/login')
  }
  req.session.token = req.query.token
  req.flash('is-success', `Logged in as ${user.username}`)
  return res.redirect('/')
})

OAuthRouter.route('/logout').get((req, res) => {
  delete req.session
  return res.redirect('/')
})

module.exports = OAuthRouter
