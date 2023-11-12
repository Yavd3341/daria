//
// Login manager
//

const Router = require("@koa/router");

function makeEndpoints(pluginMgr) {
  const router = new Router();

  router.prefix("/plugins");

  router.get("/", ctx => ctx.body = pluginMgr.getPluginList() || []);
  router.get("/coverage", ctx => ctx.body = pluginMgr.getPluginCoverageList() || []);

  router.get("/:id", ctx => ctx.body = pluginMgr.getPluginById(ctx.params.id) || {});
  router.get("/coverage/:id", ctx => ctx.body = pluginMgr.getPluginByCoverageId(ctx.params.id) || {});

  return router;
}

module.exports = {
  init(ctx) {
    ctx.router = makeEndpoints(ctx.pluginManager);
  }
}