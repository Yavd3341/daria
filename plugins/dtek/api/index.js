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

  // router.get("/meters", async ctx => ctx.body = await db.getMeters() || [])
  // router.post("/meters", async ctx => ctx.body = await db.insertMeter(ctx.json.comment, ctx.json.tariff) || [])
  // router.get("/meter/:id", async ctx => ctx.body = await db.getMeters(ctx.params.id) || [])
  // router.post("/meter/:id", async ctx => {
  //   await db.updateMeter(ctx.params.id, ctx.json.comment, ctx.json.tariff)
  //   ctx.status = 200
  // })
  // router.delete("/meter/:id", async ctx => {
  //   await db.deleteMeter(ctx.params.id)
  //   ctx.status = 200
  // })

  // router.get("/meter/:id/readings", async ctx => ctx.body = await db.getMeterLog(ctx.params.id, ctx.query.months) || [])
  // router.get("/meter/:id/readings/full", async ctx => ctx.body = await db.getMeterLogWithTariff(ctx.params.id, ctx.query.months) || [])
  // router.post("/meter/:id/readings", async ctx => {
  //   await db.upsertMeterReading(ctx.params.id, ctx.json.reading, ctx.json.date)
  //   ctx.status = 200
  // })

  // router.get("/tariffs", async ctx => ctx.body = await db.getTariffs() || [])
  // router.post("/tariffs", async ctx => ctx.body = await db.insertTariff(ctx.json.comment) || [])
  // router.get("/tariff/:id", async ctx => ctx.body = await db.getTariffs(ctx.params.id) || [])
  // router.post("/tariff/:id", async ctx => {
  //   await db.updateTariff(ctx.params.id, ctx.json.comment)
  //   ctx.status = 200
  // })
  // router.delete("/tariff/:id", async ctx => {
  //   await db.deleteTariff(ctx.params.id)
  //   ctx.status = 200
  // })

  // router.get("/tariff/:id/values", async ctx => ctx.body = await db.getTariffHistory(ctx.params.id, ctx.query.months) || [])
  // router.post("/tariff/:id/values", async ctx => {
  //   await db.upsertTariffValue(ctx.params.id, ctx.json.price, ctx.json.date)
  //   ctx.status = 200
  // })
  // router.get("/tariff/:id/values/current", async ctx => ctx.body = await db.getCurrentTariff(ctx.params.id) || [])
  // router.get("/tariffs/values", async ctx => ctx.body = await db.getCurrentTariff(ctx.params.id) || [])

  // router.get("/groups", async ctx => ctx.body = await db.getGroups() || [])
  // router.post("/groups", async ctx => ctx.body = await db.insertGroup(ctx.json.comment) || [])
  // router.get("/group/:id", async ctx => ctx.body = await db.getGroups(ctx.params.id) || [])
  // router.post("/group/:id", async ctx => {
  //   await db.updateGroup(ctx.params.id, ctx.json.comment)
  //   ctx.status = 200
  // })
  // router.delete("/group/:id", async ctx => {
  //   await db.deleteGroup(ctx.params.id)
  //   ctx.status = 200
  // })

  // router.get("/group/:id/meters", async ctx => ctx.body = await db.getMetersInGroup(ctx.params.id) || [])
  // router.post("/group/:id/meters/:meter", async ctx => {
  //   await db.linkMeterToGroup(ctx.params.meter, ctx.params.id)
  //   ctx.status = 200
  // })
  // router.delete("/group/:id/meters/:meter", async ctx => {
  //   await db.unlinkMeterFromGroup(ctx.params.meter, ctx.params.id)
  //   ctx.status = 200
  // })

  // router.get("/meters/status", async ctx => ctx.body = await db.getCurrentMeterInfo(undefined, false, ctx.query.months) || [])
  // router.get("/meter/:id/status", async ctx => ctx.body = await db.getCurrentMeterInfo(ctx.params.id, false, ctx.query.months) || [])
  // router.get("/group/:id/status", async ctx => ctx.body = await db.getCurrentMeterInfo(ctx.params.id, true, ctx.query.months) || [])

  // router.get("/meters/graph", async ctx => ctx.body = await db.getMeterLogCostGraph(undefined, ctx.query.months) || [])
  // router.get("/group/:id/graph", async ctx => ctx.body = await db.getMeterLogCostGraph(ctx.params.id, ctx.query.months) || [])

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