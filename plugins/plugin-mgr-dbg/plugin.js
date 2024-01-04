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

    const uiManager = ctx.pluginManager.getPlugin("ui");

    uiManager.addCardsBuilder(ctx => {
      if (ctx.url == "/settings/plugins")
        return {
          scripts: ["/plugins/plugin-mgr-dbg/loader.js"],
          styles: ["/plugins/plugin-mgr-dbg/styles.css"],
          templates: {
            "plugin": "plugin-mgr-dbg/html/plugin.html",
            "header": "plugin-mgr-dbg/html/header.html"
          }
        };
    });

    uiManager.addSidebarBuilder(ctx => {
      if (ctx.hint == "daria:settings" && ctx.url != "/settings/plugins")
        return {
          name: "Plugin manager",
          items: [{
            name: "Installed plugins",
            url: "/settings/plugins"
          }]
        };
    });

    uiManager.addDataProvider("/settings/plugins", () => {
      let rootLength = ctx.appRoot.length;

      let data = [
        {
          type: "header"
        }
      ];

      for (const plugin of Object.values(ctx.pluginManager.getPluginList()))
        data.push({
          type: "plugin",
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          author: plugin.author,
          coverage: plugin.coverage,
          dependencies: plugin.dependencies,
          entry: plugin.entry?.substring(rootLength)
        });

      return data;
    });
  }
}