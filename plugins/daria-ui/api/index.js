//
// Daria UI
//

const Router = require("@koa/router");

const sidebarMgr = require("./sidebar");
const cardsMgr = require("./cards");

function loadStorage(pluginManager) {
  // To be changed later

  const defaultStorage = {
    dashboard: []
  };

  const storageManager = pluginManager.getPlugin("storage-mgr");
  let storage = storageManager.getStorage("ui", defaultStorage);
  storage.load();
  storage.save();

  return storage;
}

module.exports = {
  init(ctx) {
    let storage = loadStorage(ctx.pluginManager);

    ctx.router = new Router();
    ctx.router.prefix("/ui")

    sidebarMgr.init(ctx.router);
    cardsMgr.init(ctx.router, storage);
  },

  addSidebarBuilder(builder) {
    sidebarMgr.addBuilder(builder);
  },

  addCardsBuilder(builder) {
    cardsMgr.addBuilder(builder);
  }
}