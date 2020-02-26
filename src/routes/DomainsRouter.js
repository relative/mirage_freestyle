const express = require('express'),
  bodyParser = require('body-parser'),
  cf = require('../utils/cf')

const DomainsRouter = express.Router()
const getStatus = status => {
  if (status === 'active') {
    return `<span class="has-text-success"><i class="fas fa-check-circle"></i> Active</span>`
  } else if (status === 'pending') {
    return `<span class="has-text-warning"><i class="fas fa-clock"></i> Pending</span>`
  } else if (status === 'moved') {
    return `<span class="has-text-danger"><i class="fas fa-times-circle"></i> Moved</span>`
  } else {
    return `<span class="has-text-info"><i class="fas fa-hywr"></i> ${status}</span>`
  }
}

const getDnsRecordsForZone = async zoneId => {
  const dnsRecords = await cf.dnsRecords.browse(zoneId, {
    per_page: 100
  })
  return dnsRecords.result
}

const resetDnsForZone = async zoneId => {
  const zoneRes = await cf.zones.read(zoneId)
  const zone = zoneRes.result
  const dnsRecords = await getDnsRecordsForZone(zoneId)
  await Promise.all(
    dnsRecords.map(async record => {
      await cf.dnsRecords.del(zoneId, record.id)
    })
  )
  await cf.dnsRecords.add(zoneId, {
    type: 'A',
    name: zone.name,
    content: process.env.MIRAGE_BACKENDIP,
    ttl: 1,
    proxied: true
  })
  await cf.dnsRecords.add(zoneId, {
    type: 'CNAME',
    name: `*.${zone.name}`,
    content: process.env.MIRAGE_SSLWC,
    ttl: 1
  })
}

DomainsRouter.use(
  bodyParser.urlencoded({
    extended: true
  })
)
DomainsRouter.use(bodyParser.json())

DomainsRouter.route('/create')
  .get((req, res) => {
    res.render('pages/domains/create')
  })
  .post(async (req, res) => {
    try {
      const zone = await cf.zones.add({
        name: req.body.domain,
        account: {
          id: process.env.CF_ACCOUNT_ID
        }
      })
      await resetDnsForZone(zone.result.id)
      req.flash(
        'is-success',
        `Zone created (${zone.result.id}), ${zone.result.name}. Instruct the user to change nameservers.`
      )
      req.flash(
        'is-info',
        "Don't forget to <a href='https://mirage.photos/admin/domains/create'>create the domain</a> in the mirage admin panel!"
      )
      res.redirect(`/domains/modify/${zone.result.id}`)
    } catch (err) {
      req.flash(
        'is-danger',
        `Unexpected error occurred: <code>${err.message}</code> Perhaps you tried to add an invalid or already existing domain?`
      )
      res.redirect('/domains/create')
    }
  })
DomainsRouter.route('/modify').get(async (req, res) => {
  const page = (req.query && req.query.page) || '1'
  const zonesRes = await cf.zones.browse({
    match: 'all',
    order: 'status',
    per_page: '50',
    page
  })
  let intPage = parseInt(page)
  const nextPage =
    intPage === zonesRes.result_info.total_pages ? intPage : intPage + 1
  const previousPage = intPage === 1 ? 1 : intPage - 1
  const zones = zonesRes.result
  res.render('pages/domains/modify', {
    zones,
    resultInfo: zonesRes.result_info,
    getStatus,
    page,
    intPage,
    nextPage,
    previousPage
  })
})

DomainsRouter.route('/modify/:zone').get(async (req, res) => {
  const zoneRes = await cf.zones.read(req.params.zone)
  const dns = await getDnsRecordsForZone(zoneRes.result.id)
  res.render('pages/domains/modify_zone', {
    zone: zoneRes.result,
    unmodifiable: process.env.UNMODIFIABLE.includes(zoneRes.result.name),
    getStatus,
    dns
  })
})
DomainsRouter.route('/modify/:zone/remove').get(async (req, res) => {
  if (!res.locals.profile.relative) {
    req.flash('is-danger', 'ur not relative good try')
    return res.redirect(`/domains/modify/${req.params.zone}`)
  }
  const zone = await cf.zones.read(req.params.zone)
  if (process.env.UNMODIFIABLE.includes(zone.result.name)) {
    req.flash('is-danger', 'This domain is unmodifiable')
    return res.redirect(`/domains/modify/${req.params.zone}`)
  }
  await cf.zones.del(req.params.zone)
  req.flash('is-success', `Zone ${req.params.zone} removed successfully`)
  res.redirect('/domains/modify')
})
DomainsRouter.route('/modify/:zone/reset_mirage').get(async (req, res) => {
  const zoneRes = await cf.zones.read(req.params.zone)
  if (process.env.UNMODIFIABLE.includes(zoneRes.result.name)) {
    req.flash('is-danger', 'This domain is unmodifiable')
    return res.redirect(`/domains/modify/${req.params.zone}`)
  }
  await resetDnsForZone(zoneRes.result.id)

  req.flash(
    'is-success',
    `Zone reset complete for ${zoneRes.result.id}/${zoneRes.result.name}`
  )
  res.redirect(`/domains/modify/${zoneRes.result.id}`)
})
module.exports = DomainsRouter
