const db = require("./db");

const MAIN_PAGE = "/pages/utility-meters"
const SETTINGS_TREE = "/settings"
const SETTINGS_PAGE = SETTINGS_TREE + "/utility-meters"
const SETTINGS_METERS_PAGE = SETTINGS_PAGE + "/meters"
const SETTINGS_TARIFFS_PAGE = SETTINGS_PAGE + "/tariffs"
const SETTINGS_GROUPS_PAGE = SETTINGS_PAGE + "/groups"
const GROUP_PAGE = MAIN_PAGE + "/group/"
const METER_PAGE = MAIN_PAGE + "/meter/"
const TARIFF_PAGE = MAIN_PAGE + "/tariff/"

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

  if (ctx.url != MAIN_PAGE)
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

  let id = undefined
  if (ctx.url.startsWith(GROUP_PAGE)) {
    try {
      id = Number.parseInt(ctx.url.slice(GROUP_PAGE.length).split("/", 1)[0])
    }
    catch {}
  }

  return part = {
    name: "Meter groups",
    items: groups.reduce((items, group) => {
      if (group.id != id)
        items.push({
          name: group.comment,
          url: GROUP_PAGE + group.id
        })
      return items
    }, [])
  };
}

module.exports = (ctx, config) => {
  const uiManager = ctx.pluginManager.getPlugin("ui");

  uiManager.addCardsBuilder(buildCards);
  uiManager.addSidebarBuilder(buildSidebar);
  uiManager.addSidebarBuilder(buildSidebarGroups);

  uiManager.addDataProvider(MAIN_PAGE, async ctx => [
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
      data: await db.getCurrentMeterInfo(undefined, false, 1)
    }
  ]);
}