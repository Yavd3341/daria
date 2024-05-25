const db = require("./db")

const MAIN_PAGE = "/pages/dtek"
const SETTINGS_TREE = "/settings"
const SETTINGS_PAGE = SETTINGS_TREE + "/dtek"
const SETTINGS_ACCOUNTS_PAGE = SETTINGS_PAGE + "/accounts"

SETTINGS_RESOURCES_MAP = {
  [SETTINGS_PAGE]: "main",
  [SETTINGS_ACCOUNTS_PAGE]: "accounts"
}

async function buildCards(ctx) {
  if (ctx.url == MAIN_PAGE)
    return {
      scripts: [
        "https://cdn.jsdelivr.net/npm/chart.js",
        "https://cdn.jsdelivr.net/npm/luxon",
        "https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon",
        "/plugins/dtek/main/loader.js"
      ],
      styles: [
        "/plugins/dtek/main/styles.css"
      ],
      templates: {
        "heading": "dtek/main/heading.html",
        "graph": "dtek/main/graph.html",
        "table": "dtek/main/table-common.html"
      }
    }
  else if (ctx.url.startsWith(SETTINGS_PAGE) && ctx.url in SETTINGS_RESOURCES_MAP)
    return  {
      scripts: [
        `/plugins/dtek/settings/loaders/${SETTINGS_RESOURCES_MAP[ctx.url]}.js`
      ],
      styles: [
        "/plugins/dtek/main/styles.css",
        "/plugins/dtek/settings/styles.css"
      ],
      templates: {
        page: `dtek/settings/pages/${SETTINGS_RESOURCES_MAP[ctx.url]}.html`
      }
    }
}

async function buildSidebar(ctx) {
  const part = {
    name: "DTEK",
    items: []
  }

  if (ctx.url != MAIN_PAGE || ctx.query.account != undefined)
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

  if (ctx.url == MAIN_PAGE) {
    part.items.push({
      name: "Open cabinet",
      url: "https://ok.dtek-oem.com.ua/"
    })
  }

  if (isSettingsTree && ctx.url != SETTINGS_ACCOUNTS_PAGE)
    part.items.push({
      name: "Accounts",
      url: SETTINGS_ACCOUNTS_PAGE
    })

  return part
}

async function buildSidebarAccounts(ctx) {
  if (!ctx.url.startsWith(MAIN_PAGE))
    return

  const accounts = await db.getAccounts()

  if (!(accounts?.length > 0))
    return

  const accountId = ctx.query.type == undefined 
    ? Number(ctx.query.account)
    : undefined

  return part = {
    name: "Accounts",
    items: accounts.reduce((items, account) => {
      if (account.account != accountId)
        items.push({
          name: account.address,
          url: MAIN_PAGE + "?account=" + account.account
        })
      return items
    }, [])
  }
}

module.exports = (ctx, config) => {
  const uiManager = ctx.pluginManager.getPlugin("ui")

  uiManager.addCardsBuilder(buildCards)
  uiManager.addSidebarBuilder(buildSidebar)
  uiManager.addSidebarBuilder(buildSidebarAccounts)

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
    type: "page",
    
    database: config.database,
    users: {
      login: config.credentials.login?.user,
      gatherer: config.credentials.gatherer?.user,
      user: config.credentials.user?.user
    },

    useInternalTimer: config.useInternalTimer,

    logins: await db.getLoginInfo()
  }])

  uiManager.addDataProvider(SETTINGS_ACCOUNTS_PAGE, async ctx => [{
    type: "page",
    accounts: await db.getAccounts()
  }])
}