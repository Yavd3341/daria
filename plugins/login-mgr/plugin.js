//
// Login manager
//

const Router = require("@koa/router");

var storage = undefined;
var vacuumId = undefined;

function makeEndpoints() {
  const router = new Router();

  router.prefix("/auth")

  router.post("/", ctx => {
    if (ctx.json.user === storage.username) {
      if (checkPassowrd(ctx.json.pass)) {
        ctx.status = 200;
        dropCookie(ctx.cookies.get("daria"));

        const cookie = getNewCookie();
        ctx.cookies.set("daria", cookie);

        storage.cookies.push({
          cookie: cookie,
          since: new Date()
        });

        storage.save();
      }
      else {
        ctx.status = 401;
        ctx.body = { result: "err_pass" }
      }
    } else {
      ctx.status = 401;
      ctx.body = { result: "err_user" }
    }
  });

  router.get("/", ctx => {
    ctx.status = 200;
  });

  router.post("/logout", ctx => {
    ctx.status = 200;
    dropCookie(ctx.cookies.get("daria"));
    ctx.cookies.set("daria", undefined);
  });

  return router;
}

function makeSessionGuard() {
  return (ctx, next) => {
    if (!storage.cookies.some(item => item.cookie == ctx.cookies.get("daria") 
    && getTimeDiffMins(new Date(), item.since) > storage.expireAfter)
    || (ctx.method == "POST" && ctx.URL.pathname == "/auth"))
      return next();
    else
      ctx.status = 401;
  }
}

function loadStorage(pluginManager) {
  const defaultStorage = {
    username: "admin",
    password: "admin",
    expireAfter: 24 * 60, // Full day
    cookies: []
  }

  const storageManager = pluginManager.getPlugin("storage-mgr");
  let storage = storageManager.getStorage("auth", defaultStorage);
  storage.load();

  for (let cookie of storage.cookies)
    cookie.since = new Date(cookie.since)

  return storage;
}

function checkPassowrd(pass) {
  if (storage.plain)
    return pass === storage.password;
  else
    false;
}

function getNewCookie() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz123456789";
  const length = 32;
  let cookie = '';
  for (let i = 0; i < length; i++)
    cookie += chars[Math.floor(Math.random() * chars.length)];
  return cookie;
}

function dropCookie(cookie) {
  let ci = storage.cookies.findIndex(item => item.cookie == cookie);
  if (ci != -1)
    storage.cookies.splice(ci);
}

function vacuum() {
  let now = new Date();
  storage.cookies = storage.cookies.filter(cookie => 
    getTimeDiffMins(now, cookie.since) <= storage.expireAfter);
  console.log(`Vacuumed sessions, ${storage.cookies.length} left`)
  storage.save();
}

function getTimeDiffMins(a, b) {
  return (a - b) / 1000 / 60;
}

module.exports = {
  init(ctx) {
    storage = loadStorage(ctx.pluginManager);
    ctx.router = makeEndpoints();
    ctx.koa.use(makeSessionGuard());

    vacuum();
    vacuumId = setInterval(vacuum, storage.expireAfter * 60 * 1000);
  }
}