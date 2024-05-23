const db = require("./db");

const MAIN_PAGE = "/pages/utility-meters"
const SETTINGS_TREE = "/settings"
const SETTINGS_PAGE = SETTINGS_TREE + "/utility-meters"
const SETTINGS_METERS_PAGE = SETTINGS_PAGE + "/meters"
const SETTINGS_TARIFFS_PAGE = SETTINGS_PAGE + "/tariffs"
const SETTINGS_GROUPS_PAGE = SETTINGS_PAGE + "/groups"

async function buildCards(ctx) {
  if (ctx.url == MAIN_PAGE)
    return {
      scripts: [
        "https://cdn.jsdelivr.net/npm/chart.js",
        "https://cdn.jsdelivr.net/npm/luxon",
        "https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon",
        "/plugins/utility-meters/main/loader.js"
      ],
      styles: [
        "/plugins/utility-meters/main/styles.css"
      ],
      templates: {
        "heading": "utility-meters/main/heading.html",
        "graph": "utility-meters/main/graph.html",
        "table": "utility-meters/main/table.html"
      }
    };
}

async function buildSidebar(ctx) {
  const part = {
    name: "Utility meters",
    items: []
  };

  if (ctx.url != MAIN_PAGE || ctx.query.group || ctx.query.meter || ctx.query.tariff)
    part.items.push({
      name: "Main page",
      url: MAIN_PAGE
    });

  const isSettingsTree = ctx.url.startsWith(SETTINGS_TREE) 
  if (ctx.url != SETTINGS_PAGE)
    part.items.push({
      name: isSettingsTree ? "General" : "Settings",
      url: SETTINGS_PAGE
    });

  if (ctx.url.startsWith(MAIN_PAGE)) {
    if (ctx.url != SETTINGS_METERS_PAGE)
      part.items.push({
        name: "Add readings",
        url: SETTINGS_METERS_PAGE
      });
  }

  if (isSettingsTree) {
    if (ctx.url != SETTINGS_METERS_PAGE)
      part.items.push({
        name: "Meters",
        url: SETTINGS_METERS_PAGE
      });
  
    if (ctx.url != SETTINGS_GROUPS_PAGE)
      part.items.push({
        name: "Groups",
        url: SETTINGS_GROUPS_PAGE
      });
  
    if (ctx.url != SETTINGS_TARIFFS_PAGE)
      part.items.push({
        name: "Tariffs",
        url: SETTINGS_TARIFFS_PAGE
      });
  }

  return part;
}

async function buildSidebarGroups(ctx) {
  if (!ctx.url.startsWith(MAIN_PAGE))
    return;

  const groups = await db.getGroups();

  if (!(groups?.length > 0))
    return;

  const groupId = Number(ctx.query.group);
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
  };
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

      if (meter && meter.length > 0)
        return [
          {
            type: "heading",
            title: `meter "${meter[0].comment}"`
          },
          {
            type: "graph",
            data: await db.getMeterLogWithTariff(meterId, 12),
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
            data: await db.getMeterLogWithTariff(meterId, 12)
          }
        ]
    }
    else if (ctx.query.group) {
      const groupId = Number(ctx.query.group)
      const group = await db.getGroups(groupId)

      if (group && group.length > 0)
        return [
          {
            type: "heading",
            title: `group "${group[0].comment}"`
          },
          {
            type: "graph",
            data: await db.getMeterLogCostGraph(groupId, 12),
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
            data: await db.getMeterLogCostGraph(groupId, 12)
          }
        ]
    }
    else if (ctx.query.tariff) {
      
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
}