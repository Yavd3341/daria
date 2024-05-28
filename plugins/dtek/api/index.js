const db = require("./db")
const crawler = require("./crawler")
var config = undefined

const Router = require("@koa/router")

async function gather() {
  console.log(`[DTEK] Gathering history...`)

  const logins = await db.getLogins()
  for (const login of logins)
    await crawler.login(login.login, login.password, login.is_person)

  for (const account of crawler.getLoadedAccounts()) {
    console.log(`[DTEK] Updating data for account ${account}...`)
    const id = await db.upsertAccountInfo(account, (await crawler.getInfo(account)).address)

    const readings = await crawler.getReadings(account)
    for (const reading of readings)
      db.insertMeterReading(id, reading.scale, reading.value, reading.date)
  }
}

function makeEndpoints() {
  const router = new Router()

  router.prefix("/dtek")

  router.get("/meter/:account/:zone/readings", async ctx => ctx.body = await db.getMeterLog(ctx.params.account, ctx.params.zone, ctx.query.months) || [])
  router.post("/meter/:account/:zone/readings", async ctx => {
    await db.upsertTariffValue(ctx.params.account, ctx.params.zone, ctx.json.price, ctx.json.date)
    ctx.status = 200
  })
  
  router.get("/meters", async ctx => ctx.body = await db.getCurrentMeterInfo(undefined, undefined, ctx.query.months) || [])
  router.get("/meter/:account", async ctx => ctx.body = await db.getCurrentMeterInfo(ctx.params.account, undefined, ctx.query.months) || [])
  router.get("/meter/:account/:zone", async ctx => ctx.body = await db.getCurrentMeterInfo(ctx.params.account, ctx.params.zone, ctx.query.months) || [])
  
  router.get("/meters/log", async ctx => ctx.body = await db.getMeterLogCostGraph(undefined, ctx.query.months) || [])
  router.get("/meter/:account/log", async ctx => ctx.body = await db.getMeterLogCostGraph(ctx.params.account, ctx.query.months) || [])

  router.get("/tariff", async ctx => ctx.body = await db.getCurrentTariff() || [])
  router.get("/tariff/values", async ctx => ctx.body = await db.getTariffHistory(ctx.query.months) || [])
  router.post("/tariff/values", async ctx => {
    await db.upsertTariffValue(ctx.json.price, ctx.json.date)
    ctx.status = 200
  })

  router.post("/login", async ctx => {
    await db.upsertLogin(ctx.json.login, ctx.json.password, ctx.json.isPerson)
    ctx.status = 200
  })
  router.delete("/login", async ctx => {
    await db.deleteLogin(ctx.json.login, ctx.json.isPerson)
    ctx.status = 200
  })

  router.get("/accounts", async ctx => ctx.body = await db.getAccounts() || [])
  router.get("/account/:id", async ctx => ctx.body = await db.getAccounts(ctx.params.id) || [])
  router.post("/account/:id", async ctx => ctx.body = await db.upsertAccountInfo(ctx.params.id, ctx.json.address) || [])
  router.delete("/account/:id", async ctx => ctx.body = await db.getAccdeleteAccountounts(ctx.params.id) || [])

  router.get("/zone/:id", async ctx => ctx.body = await db.getZone(ctx.params.id) || [])

  router.post("/settings", async ctx => {
    const backup = {
      database: structuredClone(config.database),
      credentials: structuredClone(config.credentials)
    }

    {
      const newConfig = ctx.json.database
      if (newConfig)
        config.database = {
          host: newConfig.host || undefined,
          port: newConfig.host ? newConfig.port : undefined,
          database: newConfig.database
        }
    }

    {
      const newCredentials = ctx.json.credentials
      if (newCredentials) {
        if (newCredentials.login?.password)
          config.credentials.login = {
            user: newCredentials.login.user,
            password: newCredentials.login.password
          }

        if (newCredentials.gatherer?.password)
          config.credentials.gatherer = {
            user: newCredentials.gatherer.user,
            password: newCredentials.gatherer.password
          }

        if (newCredentials.user?.password)
          config.credentials.user = {
            user: newCredentials.user.user,
            password: newCredentials.user.password
          }
      }
    }

    if (ctx.json.useInternalTimer != undefined) // May be false
      config.useInternalTimer = ctx.json.useInternalTimer;

    if (await db.tryConnect()) {
      config.save()
      ctx.status = 200
    }
    else {
      config.database = backup.database
      config.credentials = backup.credentials
      db.tryConnect()

      ctx.status = 400
    }
  })

  router.post("/login", async ctx => {
    await db.upsertLogin(ctx.json.login, ctx.json.password, ctx.json.isPerson)
    gather()
    ctx.status = 200
  })

  router.delete("/login", async ctx => {
    ctx.status = 200
    db.deleteLogin(ctx.json.login, ctx.json.isPerson)
  })

  router.delete("/account/:account", async ctx => {
    ctx.status = 200
    db.deleteAccount(ctx.params.account)
  })

  return router
}

module.exports = {
  init(ctx) {
    ctx.router = makeEndpoints()

    const defaultConfig = {
      database: {},
      credentials: {
        login: {
          user: "login",
          password: "changeme"
        },
        gatherer: {
          user: "gatherer",
          password: "changeme"
        },
        user: {
          user: "user",
          password: "changeme"
        }
      }
    }

    const configManager = ctx.pluginManager.getPlugin("storage-mgr")
    config = configManager.getStorage("dtek", defaultConfig)
    config.load()

    crawler.init(ctx.pluginManager.getPlugin("needle"))
    db.init(ctx.pluginManager.getPlugin("postgresql"), config, ctx.eventBus)//.then(gather)

    if (config.useInternalTimer)
      setInterval(gather, 24 * 60 * 60 * 1000) // Once a day

    require("./ui")(ctx, config)
  }
}