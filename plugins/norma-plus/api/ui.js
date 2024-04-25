const crawler = require("./crawler");
const db = require("./db");

async function buildCards(ctx) {
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
  const part = {
    name: "Norma PLUS",
    items: []
  };

  const isDashboard = ctx.url == "/";
  const isPluginSettings = ctx.url == "/settings/norma-plus";
  const isMainPage = ctx.url == "/pages/norma-plus";

  const accounts = await db.getManagedAccounts();
  if (accounts?.length > 0) {
    let account = Number(ctx.query.account);

    if (!account && accounts?.length == 1)
      account = accounts[0];

    if (isDashboard || isPluginSettings)
      part.items.push({
        name: "Main page",
        url: "/pages/norma-plus"
      });
    
    if (isMainPage) {
      if (!crawler.getSession(account))
        await crawler.login(account);

      const session = crawler.getSession(account);
        
      part.items.push(
        {
          name: "Open cabinet",
          url: "https://userstat.normaplus.com/index.php" + (session ? `?session=${session}` : "")
        },
        {
          name: "Add cash",
          url: "https://easypay.ua/catalog/internet/norma-plus"
        }
      );
    }
  }

  if (ctx.url.startsWith("/settings") && !isPluginSettings || isMainPage)
    part.items.push({
      name: "Settings",
      url: "/settings/norma-plus"
    });

  return part;
}

async function buildSidebarAccounts(ctx) {
  const accounts = await db.getManagedAccounts();

  if (!(accounts?.length > 1) || !ctx.url.startsWith("/pages/norma-plus"))
    return;

  const part = {
    name: "Accounts",
    items: []
  };

  for (const account of accounts)
   if (account != ctx.query.account)
      part.items.push({
        name: account,
        url: "/pages/norma-plus?account=" + account
      })

  return part;
}

module.exports = (ctx, config) => {
  const uiManager = ctx.pluginManager.getPlugin("ui");

  uiManager.addCardsBuilder(buildCards);
  uiManager.addSidebarBuilder(buildSidebar);
  uiManager.addSidebarBuilder(buildSidebarAccounts);

  uiManager.addDataProvider("/settings/norma-plus", async ctx => {
    let data = [{
      type: "settings",
      
      database: config.database,
      users: {
        login: config.credentials.login?.user,
        gatherer: config.credentials.gatherer?.user,
        user: config.credentials.user?.user
      },

      useInternalTimer: config.useInternalTimer,

      accounts: await crawler.getManagedAccounts()
    }];

    return data;
  });

  uiManager.addDataProvider("/pages/norma-plus", async ctx => {
    const accounts = await db.getManagedAccounts();
    let account = Number(ctx.query.account);

    if (!account && accounts?.length == 1)
      account = accounts[0];

    if (!crawler.getSession(account))
      await crawler.login(account);

    if (!crawler.getSession(account))
      return;

    const userInfo = await crawler.getUserInfo(account);

    if (!userInfo)
      return undefined;

    const payments = await crawler.getPayments(account);
    const nextMonth = payments.at(-1);

    let data = [
      {
        type: "main",
        userInfo,
        balance: nextMonth.prevBalance,
        currentMonth: await db.getCurrentMonthSpendings(account),
        nextMonth: nextMonth.spendings,
        data: await db.getRecords(account, ctx.query.days > 0 ? ctx.query.days : 365)
      }
    ];

    return data;
  });
}