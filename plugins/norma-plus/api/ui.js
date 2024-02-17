const crawler = require("./crawler");
const db = require("./db");

function buildCards(ctx) {
  if (ctx.url == "/settings/norma-plus")
    return {
      scripts: [
        "/plugins/norma-plus/settings/loader.js", 
        "/plugins/norma-plus/user-info/loader.js"
      ],
      styles: [
        "/plugins/norma-plus/settings/styles.css",
        "/plugins/norma-plus/user-info/styles.css"
      ],
      templates: { 
        "settings": "norma-plus/settings/index.html", 
        "user-info": "norma-plus/user-info/index.html" 
      }
    };
  else if (ctx.url == "/pages/norma-plus")
    return {
      scripts: [
        "https://cdn.jsdelivr.net/npm/chart.js",
        "https://cdn.jsdelivr.net/npm/luxon",
        "https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon",
        "/plugins/norma-plus/history/loader.js",
        "/plugins/norma-plus/user-info/loader.js"
      ],
      styles: [
        "/plugins/norma-plus/history/styles.css",
        "/plugins/norma-plus/user-info/styles.css"
      ],
      templates: { 
        "header": "norma-plus/history/header.html",
        "user-info": "norma-plus/user-info/index.html",
        "quick": "norma-plus/history/quick.html",
        "balance-history": "norma-plus/history/balance-history.html",
        //"log": "norma-plus/history/log.html"
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
      ...config.credentials
    }];

    const userInfo = await crawler.getUserInfo();
    if (userInfo)
      data.push({
        type: "user-info",
        ...userInfo
      })

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
        type: "header"
      },
      {
        type: "user-info",
        ...userInfo
      },
      {
        type: "quick",
        balance: nextMonth.prevBalance,
        currentMonth: payments.at(-2).spendings,
        nextMonth: nextMonth.spendings
      },
      {
        type: "balance-history",
        balance: nextMonth.prevBalance,
        data: db.mergeBalanceLog(db.resolvePaymentsData(payments, true)) // Todo: needs database
      }
    ];

    return data;
  });
}