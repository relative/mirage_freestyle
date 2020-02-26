require('dotenv').config()
const app = require('./app')
process.env.UNMODIFIABLE = process.env.UNMODIFIABLE.split(',')
app.listen(process.env.PORT, () => {
  console.log('listening on port', process.env.PORT)
})
