const crawler = require("./crawler");
const db = require("./db");
var config = undefined;

const Router = require("@koa/router");

async function gather(accounts) {
  if (!accounts)
    return;

  if (!Array.isArray(accounts))
    accounts = [accounts];

  console.log(`[Norma PLUS] Gathering history...`)
  Promise.all(
    accounts.map(async account => ({
      account,
      data: await crawler.getPayments(account)
    }))
  ).then(db.addRecords);
}

function makeEndpoints() {
  const router = new Router();

  router.prefix("/norma-plus");

  router.get("/", async ctx => ctx.body = await crawler.getUserInfo() || []);
  router.get("/payments", async ctx => ctx.body = await crawler.getPayments() || []);

  router.post("/settings", async ctx => {
    const backup = {
      database: structuredClone(config.database),
      credentials: structuredClone(config.credentials)
    };

    {
      const newConfig = ctx.json.database;
      if (newConfig)
        config.database = {
          host: newConfig.host || undefined,
          port: newConfig.host ? newConfig.port : undefined,
          database: newConfig.database
        };
    }

    {
      const newCredentials = ctx.json.credentials;
      if (newCredentials) {
        if (newCredentials.login?.password)
          config.credentials.login = {
            user: newCredentials.login.user,
            password: newCredentials.login.password
          };

        if (newCredentials.gatherer?.password)
          config.credentials.gatherer = {
            user: newCredentials.gatherer.user,
            password: newCredentials.gatherer.password
          };

        if (newCredentials.user?.password)
          config.credentials.user = {
            user: newCredentials.user.user,
            password: newCredentials.user.password
          };
      }
    }

    if (ctx.json.useInternalTimer != undefined) // May be false
      config.useInternalTimer = ctx.json.useInternalTimer;

    if (await db.tryConnect()) {
      config.save();
      ctx.status = 200;
    }
    else {
      config.database = backup.database;
      config.credentials = backup.credentials;
      db.tryConnect();

      ctx.status = 400;
    }
  });

  router.post("/account", async ctx => {
    if (await crawler.login(ctx.json)) {
      ctx.status = 200;

      db.updateLoginInfo(ctx.json);
      gather(ctx.json.account);
    }
    else
      ctx.status = 400;
  });

  router.delete("/account/:account", async ctx => {
    ctx.status = crawler.deleteAccount(ctx.params.account)
      ? 200
      : 400;
  });

  router.post("/refresh-session/:account", ctx => {
    ctx.status = Number.isInteger(ctx.params.account) 
      && crawler.login(Number(ctx.params.account)) 
        ? 200
        : 400;
  });

  router.post("/gather", ctx => {
    ctx.status = 200;
    db.getManagedAccounts().then(gather);
  });

  return router;
}

module.exports = {
  init(ctx) {
    ctx.router = makeEndpoints();

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
      },
      maxTries: 5
    };

    const configManager = ctx.pluginManager.getPlugin("storage-mgr");
    config = configManager.getStorage("norma-plus", defaultConfig);
    config.load();

    const dbPromise = db.init(ctx.pluginManager.getPlugin("postgresql"), config, ctx.eventBus);
    crawler.init(ctx.pluginManager.getPlugin("needle"), config);

    if (config.useInternalTimer) {
      dbPromise.then(db.getManagedAccounts).then(gather);
      setInterval(() => db.getManagedAccounts().then(gather), 24 * 60 * 60 * 1000); // Once a day
    }

    require("./ui")(ctx, config);
  }
};