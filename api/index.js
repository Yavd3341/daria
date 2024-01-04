const Koa = require("koa");
const Router = require('@koa/router');

const app = new Koa();
const router = new Router();

app.use(require("./koaJson.js"));

const { join } = require("path");
const pluginManager = require("./pluginManager.js");
pluginManager.init({
  app: this,
  koa: app,
  router: router,
  appRoot: join(__dirname, "..")
});

if (!pluginManager.getPlugin("login-mgr")) {
  router
    .get ("/auth",        ctx => ctx.status = 200)
    .post("/auth",        ctx => ctx.status = 200)
    .post("/auth/logout", ctx => ctx.status = 200);
}

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3100);

pluginManager.getPlugin("notifier")?.sendNotification("Daria started");