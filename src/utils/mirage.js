const fetch = require('node-fetch')

module.exports = async token => {
  try {
    const res = await fetch(`${process.env.MIRAGE_BASEURL}/oauth/user`, {
      headers: {
        authorization: token
      }
    })
    const json = await res.json()
    if (!json.user) return false
    return json.user
  } catch (err) {
    return false
  }
}
