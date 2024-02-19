const crawler = require("./crawler");
const db = require("./db");

function buildCards(ctx) {
  if (ctx.url == "/settings/norma-plus")
    return {
      scripts: [
        "/plugins/norma-plus/settings/loader.js"
      ],
      styles: [
        "/plugins/norma-plus/settings/styles.css"
      ],
      templates: { 
        "settings": "norma-plus/settings/index.html" 
      }
    };
  else if (ctx.url == "/pages/norma-plus")
    return {
      scripts: [
        "https://cdn.jsdelivr.net/npm/chart.js",
        "https://cdn.jsdelivr.net/npm/luxon",
        "https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon",
        "/plugins/norma-plus/main/loader.js"
      ],
      styles: [
        "/plugins/norma-plus/main/styles.css"
      ],
      templates: {
        "main": "norma-plus/main/index.html"
      }
    };
}

async function buildSidebar(ctx) {
  let part = {
    name: "Norma PLUS",
    items: []
  };

  let isDashboard = ctx.url == "/";
  let isPluginSettings = ctx.url == "/settings/norma-plus";
  let isMainPage = ctx.url == "/pages/norma-plus";

  if (isDashboard || isPluginSettings)
    part.items.push({
      name: "Main page",
      url: "/pages/norma-plus"
    });
  
    if (isDashboard || isMainPage) {
      if (!crawler.getSession())
        await crawler.login();
      part.items.push(
        {
          name: "Open cabinet",
          url: `https://userstat.normaplus.com/index.php?session=${crawler.getSession()}`
        },
        {
          name: "Add cash",
          url: "https://easypay.ua/catalog/internet/norma-plus"
        }
      );
    }

  if (ctx.url.startsWith("/settings") && !isPluginSettings || isMainPage)
    part.items.push({
      name: "Settings",
      url: "/settings/norma-plus"
    });

  return part;
}

module.exports = (ctx, config) => {
  const uiManager = ctx.pluginManager.getPlugin("ui");

  uiManager.addCardsBuilder(buildCards);
  uiManager.addSidebarBuilder(buildSidebar);

  uiManager.addDataProvider("/settings/norma-plus", async ctx => {
    let data = [{
      type: "settings",
      // Todo: requires DB
    }];

    return data;
  });

  uiManager.addDataProvider("/pages/norma-plus", async ctx => {
    const userInfo = await crawler.getUserInfo();

    if (!userInfo)
      return undefined;

    const payments = await crawler.getPayments();
    const nextMonth = payments.at(-1);

    let data = [
      {
        type: "main",
        userInfo,
        balance: nextMonth.prevBalance,
        currentMonth: payments.at(-2).spendings,
        nextMonth: nextMonth.spendings,
        data: db.mergeBalanceLog(db.resolvePaymentsData(payments, true)) // Todo: needs database
      }
    ];

    return data;
  });
}