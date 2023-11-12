//
// Login manager
//

const Router = require("@koa/router");

function makeEndpoints(storage) {
  const router = new Router();

  router.prefix("/auth")

  router.post("/", ctx => {
    if (ctx.json.user === storage.username) {
      if (checkPassowrd(ctx.json.pass, storage)) {
        ctx.status = 200;
        dropCookie(ctx.cookies.get("daria"));

        const cookie = getNewCookie();
        ctx.cookies.set("daria", cookie);
        
        storage.cookies.push(cookie);
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

function makeSessionGuard(storage) {
  return (ctx, next) => {
    if (storage.cookies.includes(ctx.cookies.get("daria"))
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
    plain: true,
    cookies: []
  }

  const storageManager = pluginManager.getPlugin("storage-mgr");
  let storage = storageManager.getStorage("auth", defaultStorage);
  storage.load();
  storage.save();

  return storage;
}

function checkPassowrd(pass, storage) {
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

async function dropCookie(cookie) {
  if (storage.cookies.includes(cookie))
    storage.cookies.splice(storage.cookies.indexOf(cookie));
}

module.exports = {
  init(ctx) {
    const storage = loadStorage(ctx.pluginManager);
    ctx.router = makeEndpoints(storage);
    ctx.koa.use(makeSessionGuard(storage));
  }
}