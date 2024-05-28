//
// Daria UI
//

const Router = require("@koa/router");

const sidebarMgr = require("./sidebar");
const cardsMgr = require("./cards");

module.exports = {
  init(ctx) {
    ctx.router = new Router();
    ctx.router.prefix("/ui")

    sidebarMgr.init(ctx.router);
    cardsMgr.init(ctx.router);
  },

  addSidebarBuilder(builder) {
    sidebarMgr.addBuilder(builder);
  },

  addCardsBuilder(builder) {
    cardsMgr.addBuilder(builder);
  },

  addDataProvider(url, provider) {
    cardsMgr.addDataProvider(url, provider);
  }
}