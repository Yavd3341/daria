const db = require("./db")
var config = undefined

const Router = require("@koa/router")

function makeEndpoints() {
  const router = new Router()

  router.prefix("/utility-meters")

  router.safeGet = (path, data) => router.get(path, async ctx => ctx.body = await data(ctx) || [])
  router.safeGet = (path, data) => router.get(path, async ctx => ctx.body = await data(ctx) || [])

  router.get("/meters", async ctx => ctx.body = await db.getMeters() || [])
  router.post("/meters", async ctx => ctx.body = await db.insertMeter(ctx.json.comment, ctx.json.tariff) || [])
  router.get("/meter/:id", async ctx => ctx.body = await db.getMeters(ctx.params.id) || [])
  router.post("/meter/:id", async ctx => {
    db.updateMeter(ctx.params.id, ctx.json.comment, ctx.json.tariff)
    ctx.response = 200
  })
  router.delete("/meter/:id", async ctx => {
    db.deleteMeter(ctx.params.id)
    ctx.response = 200
  })

  router.get("/meter/:id/readings", async ctx => ctx.body = await db.getMeterLog(ctx.params.id, ctx.query.months) || [])
  router.get("/meter/:id/readings/full", async ctx => ctx.body = await db.getMeterLogWithTariff(ctx.params.id, ctx.query.months) || [])
  router.post("/meter/:id/readings", async ctx => {
    await db.upsertMeterReading(ctx.params.id, ctx.json.reading, ctx.json.date)
    ctx.response = 200
  })

  router.get("/tariffs", async ctx => ctx.body = await db.getTariffs() || [])
  router.post("/tariffs", async ctx => ctx.body = await db.insertTariff(ctx.json.comment) || [])
  router.get("/tariff/:id", async ctx => ctx.body = await db.getTariffs(ctx.params.id) || [])
  router.post("/tariff/:id", async ctx => {
    db.updateTariff(ctx.params.id, ctx.json.comment)
    ctx.response = 200
  })
  router.delete("/tariff/:id", async ctx => {
    db.deleteTariff(ctx.params.id)
    ctx.response = 200
  })

  router.get("/tariff/:id/values", async ctx => ctx.body = await db.getTariffHistory(ctx.params.id, ctx.query.months) || [])
  router.post("/tariff/:id/values", async ctx => {
    await db.upsertTariffValue(ctx.params.id, ctx.json.reading, ctx.json.date)
    ctx.response = 200
  })
  router.get("/tariff/:id/values/current", async ctx => ctx.body = await db.getCurrentTariff(ctx.params.id) || [])

  router.get("/groups", async ctx => ctx.body = await db.getGroups() || [])
  router.post("/groups", async ctx => ctx.body = await db.insertGroup(ctx.json.comment) || [])
  router.get("/group/:id", async ctx => ctx.body = await db.getGroups(ctx.params.id) || [])
  router.post("/group/:id", async ctx => {
    db.updateGroup(ctx.params.id, ctx.json.comment)
    ctx.response = 200
  })
  router.delete("/group/:id", async ctx => {
    db.deleteGroup(ctx.params.id)
    ctx.response = 200
  })

  router.get("/group/:id/meters", async ctx => ctx.body = await db.getMetersInGroup(ctx.params.id) || [])
  router.post("/group/:id/meters/:meter", async ctx => {
    await db.linkMeterToGroup(ctx.params.meter, ctx.params.id)
    ctx.response = 200
  })
  router.delete("/group/:id/meters/:meter", async ctx => {
    await db.unlinkMeterFromGroup(ctx.params.meter, ctx.params.id)
    ctx.response = 200
  })

  router.get("/meters/status", async ctx => ctx.body = await db.getCurrentMeterInfo(undefined, false, ctx.query.months) || [])
  router.get("/meter/:id/status", async ctx => ctx.body = await db.getCurrentMeterInfo(ctx.params.id, false, ctx.query.months) || [])
  router.get("/group/:id/status", async ctx => ctx.body = await db.getCurrentMeterInfo(ctx.params.id, true, ctx.query.months) || [])

  router.get("/meters/graph", async ctx => ctx.body = await db.getMeterLogCostGraph(undefined, ctx.query.months) || [])
  router.get("/group/:id/graph", async ctx => ctx.body = await db.getMeterLogCostGraph(ctx.params.id, ctx.query.months) || [])

  return router
}

module.exports = {
  init(ctx) {
    ctx.router = makeEndpoints()

    const defaultConfig = {
      database: {},
      credentials: {
        admin: {
          user: "admin",
          password: "changeme"
        },
        gatherer: {
          user: "gatherer",
          password: "changeme"
        },
        guest: {
          user: "guest",
          password: "changeme"
        }
      }
    }

    const configManager = ctx.pluginManager.getPlugin("storage-mgr")
    config = configManager.getStorage("utility-meters", defaultConfig)
    config.load()

    db.init(ctx.pluginManager.getPlugin("postgresql"), config, ctx.eventBus)

    require("./ui")(ctx, config)
  }
}