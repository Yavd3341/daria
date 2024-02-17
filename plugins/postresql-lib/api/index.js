const { Pool, Client } = require("pg");
const Router = require("@koa/router");

function makeRowsAccessor(queriable) {
  return (query, params) => 
    queriable
      .query(query, params)
      .then(result => result.rows);
}

function makeJsonAccessor(queriable) {
  return (query, params) => 
    queriable
      .query(query, params)
      .then(result => result.rows[0]?.data);
}

module.exports = {
  init(ctx) {
    const defaultConfig = {
      host: "localhost",
      port: 5432
    };

    const configManager = ctx.pluginManager.getPlugin("storage-mgr");
    config = configManager.getStorage("postgres", defaultConfig);
    config.load();

    ctx.router = new Router();
  
    const eventBus = ctx.eventBus;
    ctx.router.post("/postgres", async ctx => {
      if (ctx.json.host && ctx.json.port) {
        config.host = ctx.json.host;
        config.port = ctx.json.port;
        config.save();
        ctx.status = 200;
        eventBus.fire("postgres-default-host-updated");
      }
      else
        ctx.status = 405;
    });

    const uiManager = ctx.pluginManager.getPlugin("ui");
    const settingsUrl = "/settings/postgres";

    uiManager.addCardsBuilder(ctx => {
      if (ctx.url == settingsUrl)
        return {
          scripts: ["/plugins/postresql-lib/loader.js"],
          styles: ["/plugins/postresql-lib/styles.css"],
          templates: { "settings": "postresql-lib/settings.html" }
        };
    });

    uiManager.addSidebarBuilder(ctx => {
      if (ctx.url.startsWith("/settings") && ctx.url != settingsUrl)
        return {
          name: "PostgreSQL",
          items: [{ name: "Default host config", url: settingsUrl }]
        };
    });

    uiManager.addDataProvider(settingsUrl, ctx => [{
      type: "settings",
      host: config.host,
      port: config.port
    }]);
  },

  augment(queriable) {
    queriable.getRows = makeRowsAccessor(queriable);
    queriable.getJson = makeJsonAccessor(queriable);
  },

  getDefaultHost() {
    return {
      host: config.host,
      port: config.port
    }
  },

  makePool(credentials, db) {
    let pool = new Pool({...credentials, ...db});
    this.augment(pool);
    return pool;
  },
  makeClient(credentials, db) {
    let client = new Client({...credentials, ...db});
    this.augment(client);
    return client;
  }
};