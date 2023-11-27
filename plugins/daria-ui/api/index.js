//
// Daria UI
//

const Router = require("@koa/router");

const sidebarMgr = require("./sidebar");

function loadStorage(pluginManager) {
  // To be changed later

  const defaultStorage = {
    username: "admin",
    password: "admin",
    cookies: []
  }

  const storageManager = pluginManager.getPlugin("storage-mgr");
  let storage = storageManager.getStorage("auth", defaultStorage);
  storage.load();
  storage.save();

  return storage;
}

module.exports = {
  init(ctx) {
    ctx.router = new Router();
    ctx.router.prefix("/ui")

    sidebarMgr.init(ctx.router);
  },

  addSidebarBuilder(builder) {
    sidebarMgr.addSidebarBuilder(builder);
  }
}