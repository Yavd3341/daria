const db = require("./db")

const MAIN_PAGE = "/pages/utility-meters"
const SETTINGS_TREE = "/settings"
const SETTINGS_PAGE = SETTINGS_TREE + "/utility-meters"
const SETTINGS_METERS_PAGE = SETTINGS_PAGE + "/meters"
const SETTINGS_TARIFFS_PAGE = SETTINGS_PAGE + "/tariffs"
const SETTINGS_GROUPS_PAGE = SETTINGS_PAGE + "/groups"

const SETTINGS_RESOURCES_MAP = {
  [SETTINGS_PAGE]: "database",
  [SETTINGS_METERS_PAGE]: "meters",
  [SETTINGS_TARIFFS_PAGE]: "tariffs",
  [SETTINGS_GROUPS_PAGE]: "groups"
}

async function buildCards(ctx) {
  if (ctx.url == MAIN_PAGE) {
    const page =  {
      scripts: [
        "https://cdn.jsdelivr.net/npm/chart.js",
        "https://cdn.jsdelivr.net/npm/luxon",
        "https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon",
        "/plugins/utility-meters/main/loader-common.js"
      ],
      styles: [
        "/plugins/utility-meters/main/styles.css"
      ],
      templates: {
        "heading": "utility-meters/main/heading.html",
        "graph": "utility-meters/main/graph.html"
      }
    }

    if (ctx.query.tariff) {
      page.scripts.push("/plugins/utility-meters/main/loader-tariffs.js")
      page.templates["table"] = "utility-meters/main/table-common.html"
    }
    else {
      page.scripts.push("/plugins/utility-meters/main/loader-meters.js")
      page.templates["table"] = "utility-meters/main/table-meters.html"
    }

    return page
  }
  else if (ctx.url.startsWith(SETTINGS_PAGE) && ctx.url in SETTINGS_RESOURCES_MAP)
    return  {
      scripts: [
        `/plugins/utility-meters/settings/loaders/${SETTINGS_RESOURCES_MAP[ctx.url]}.js`
      ],
      styles: [
        "/plugins/utility-meters/main/styles.css",
        "/plugins/utility-meters/settings/styles.css"
      ],
      templates: {
        editor: `utility-meters/settings/editors/${SETTINGS_RESOURCES_MAP[ctx.url]}.html`
      }
    }
}

async function buildSidebar(ctx) {
  const part = {
    name: "Utility meters",
    items: []
  }

  if (ctx.url != MAIN_PAGE || ctx.query.group || ctx.query.meter || ctx.query.tariff)
    part.items.push({
      name: "Main page",
      url: MAIN_PAGE
    })

  const isSettingsTree = ctx.url.startsWith(SETTINGS_TREE) 
  if (ctx.url != SETTINGS_PAGE)
    part.items.push({
      name: isSettingsTree ? "General" : "Settings",
      url: SETTINGS_PAGE
    })

  if (ctx.url.startsWith(MAIN_PAGE)) {
    if (ctx.url != SETTINGS_METERS_PAGE)
      part.items.push({
        name: "Add readings",
        url: SETTINGS_METERS_PAGE
      })
  }

  if (isSettingsTree) {
    if (ctx.url != SETTINGS_METERS_PAGE)
      part.items.push({
        name: "Meters",
        url: SETTINGS_METERS_PAGE
      })
  
    if (ctx.url != SETTINGS_GROUPS_PAGE)
      part.items.push({
        name: "Groups",
        url: SETTINGS_GROUPS_PAGE
      })
  
    if (ctx.url != SETTINGS_TARIFFS_PAGE)
      part.items.push({
        name: "Tariffs",
        url: SETTINGS_TARIFFS_PAGE
      })
  }

  return part
}

async function buildSidebarGroups(ctx) {
  if (!ctx.url.startsWith(MAIN_PAGE))
    return

  const groups = await db.getGroups()

  if (!(groups?.length > 0))
    return

  const groupId = Number(ctx.query.group)
  return part = {
    name: "Meter groups",
    items: groups.reduce((items, group) => {
      if (group.id != groupId)
        items.push({
          name: group.comment,
          url: MAIN_PAGE + "?group=" + group.id
        })
      return items
    }, [])
  }
}

module.exports = (ctx, config) => {
  const uiManager = ctx.pluginManager.getPlugin("ui")

  uiManager.addCardsBuilder(buildCards)
  uiManager.addSidebarBuilder(buildSidebar)
  uiManager.addSidebarBuilder(buildSidebarGroups)

  uiManager.addDataProvider(MAIN_PAGE, async ctx => {
    if (ctx.query.meter) {
      const meterId = Number(ctx.query.meter)
      const meter = await db.getMeters(meterId)

      if (meter && meter.length > 0) {
        const data = await db.getMeterLogWithTariff(meterId, 12)
        return [
          {
            type: "heading",
            title: `meter "${meter[0].comment}"`
          },
          {
            type: "graph",
            data: data,
            fields: [
              {
                name: "Readings",
                field: "reading"
              },
              {
                name: "Cost",
                field: "cost",
                type: "money"
              },
              {
                name: "Readings difference",
                field: "difference"
              },
              {
                name: "Cost difference",
                field: "cost_difference",
                type: "money"
              }
            ]
          },
          {
            type: "table",
            data: data
          }
        ]
      }
    }
    else if (ctx.query.group) {
      const groupId = Number(ctx.query.group)
      const group = await db.getGroups(groupId)

      if (group && group.length > 0) {
        const data = await db.getMeterLogCostGraph(groupId, 12)
        return [
          {
            type: "heading",
            title: `group "${group[0].comment}"`
          },
          {
            type: "graph",
            data: data,
            fields: [
              {
                name: "Readings",
                field: "sum"
              },
              {
                name: "Cost",
                field: "cost",
                type: "money"
              },
              {
                name: "Readings difference",
                field: "difference"
              },
              {
                name: "Cost difference",
                field: "cost_difference",
                type: "money"
              }
            ]
          },
          {
            type: "table",
            title: "Meters",
            data: await db.getCurrentMeterInfo(groupId, true, 1)
          },
          {
            type: "table",
            title: "Log",
            data: data
          }
        ]
      }
    }
    else if (ctx.query.tariff) {
      const tariffId = Number(ctx.query.tariff)
      const tariff = await db.getTariffs(tariffId)

      if (tariff && tariff.length > 0) {
        const data = await db.getTariffHistory(tariffId)
        const page = [
          {
            type: "heading",
            title: `tariff "${tariff[0].comment}"`
          },
          {
            type: "table",
            data: data
          }
        ]

        if (data && data.length > 1) {
          page.splice(2, 0, {
            type: "graph",
            data: await db.getMeterLogCostGraph(tariffId, 12),
            fields: [
              {
                name: "Price",
                field: "value",
                type: "money"
              }
            ]
          })
        }

        return page
      }
    }
    else {
      return [
        {
          type: "heading"
        },
        {
          type: "graph",
          data: await db.getMeterLogCostGraph(undefined, 12),
          fields: [
            {
              name: "Cost",
              field: "cost",
              type: "money"
            },
            {
              name: "Cost difference",
              field: "cost_difference",
              type: "money"
            }
          ]
        },
        {
          type: "table",
          title: "Meters",
          data: await db.getCurrentMeterInfo(undefined, false, 1)
        }
      ]
    }
  })

  uiManager.addDataProvider(SETTINGS_PAGE, async ctx => [{
    type: "editor",
    database: config.database,
    users: {
      admin: config.credentials.admin?.user,
      gatherer: config.credentials.gatherer?.user,
      guest: config.credentials.guest?.user
    }
  }])

  uiManager.addDataProvider(SETTINGS_METERS_PAGE, async ctx => [{
    type: "editor",
    meters: await db.getCurrentMeterState(),
    tariffs: await db.getTariffs()
  }])

  uiManager.addDataProvider(SETTINGS_TARIFFS_PAGE, async ctx => [{ 
    type: "editor",
    tariffs: await db.getTariffsWithHistory()
  }])

  uiManager.addDataProvider(SETTINGS_GROUPS_PAGE, async ctx => [{ 
    type: "editor",
    meters: await db.getMeters(),
    groups: await db.getGroupsWithMeters()
  }])
}