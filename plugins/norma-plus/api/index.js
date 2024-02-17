const crawler = require("./crawler");
var config = undefined;

const Router = require("@koa/router");

function makeEndpoints() {
  const router = new Router();

  router.prefix("/norma-plus");

  router.get("/", async ctx => ctx.body = await crawler.getUserInfo() || []);
  router.get("/payments", async ctx => ctx.body = await crawler.getPayments() || []);

  router.post("/settings", async ctx => {
    const success = await crawler.login(ctx.json);
    if (success) {
      config.credentials = {
        account: ctx.json.account,
        username: ctx.json.username,
        password: ctx.json.password
      };
      config.save();
      ctx.status = 200;
    }
    else
      ctx.status = 405;
  });

  router.post("/refresh-session", ctx => {
    crawler.login();
    ctx.status = 200;
  });

  return router;
}

module.exports = {
  init(ctx) {
    ctx.router = makeEndpoints();

    const defaultConfig = {
      credentials: {
        account: 0,
        username: "",
        password: ""
      },
      maxTries: 5
    };

    const configManager = ctx.pluginManager.getPlugin("storage-mgr");
    config = configManager.getStorage("norma-plus", defaultConfig);
    config.load();

    const needle = ctx.pluginManager.getPlugin("needle");

    crawler.init(needle, config);

    require("./ui")(ctx, config);
  }
};