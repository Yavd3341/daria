const Koa = require("koa");
const Router = require('@koa/router');

const app = new Koa();
const router = new Router();

app.use(require("./koaJson.js"));

const pluginManager = require("./pluginManager.js");
pluginManager.init({
  app: this,
  koa: app,
  router: router
});

if (!pluginManager.getPluginByCoverageId("login-mgr")){
  router
    .post("/auth",          ctx => ctx.status = 200)
    .post("/auth/logout",   ctx => ctx.status = 200)
    .get ("/auth/validate", ctx => ctx.status = 200);
}

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3100);