//
// Login manager
//

const Router = require("@koa/router");

var storage = undefined;
var isDirty = false;

var vacuumId = undefined;
var saveId = undefined;

function makeEndpoints() {
  const router = new Router();

  router.prefix("/auth")

  router.post("/", ctx => {
    if (ctx.json.user === storage.username) {
      if (ctx.json.pass === storage.password) {
        ctx.status = 200;

        const cookie = ctx.cookies.get("daria") || getNewCookie();
        ctx.cookies.set("daria", cookie, { sameSite: "strict" });

        storage.cookies[cookie] = {
          since: new Date()
        };

        isDirty = true;
      }
      else {
        ctx.status = 401;
        ctx.body = { result: "err_pass" };
      }
    } else {
      ctx.status = 401;
      ctx.body = { result: "err_user" };
    }
  });

  router.get("/", ctx => {
    ctx.status = 200;
  });

  router.post("/logout", ctx => {
    ctx.status = 200;

    if (ctx.json.cookie) {
      if (ctx.json.cookie == "all")
        storage.cookies = {};
      else
        dropCookie(ctx.json.cookie);
    }
    else {
      dropCookie(ctx.cookies.get("daria"));
      ctx.cookies.set("daria", undefined, { sameSite: "strict" });
    }
  });

  router.post("/settings", ctx => {
    if (ctx.json.user != undefined && ctx.json.user == "") {
      ctx.status = 400;
      ctx.body = { result: "err_user" };
      return;
    }

    if (ctx.json.pass != undefined && ctx.json.pass == "") {
      ctx.status = 400;
      ctx.body = { result: "err_pass" };
      return;
    }

    if (ctx.json.expireAfter <= 0) {
      ctx.status = 400;
      ctx.body = { result: "err_expire_after" };
      return;
    }

    if (ctx.json.saveInterval <= 0) {
      ctx.status = 400;
      ctx.body = { result: "err_save_interval" };
      return;
    }

    storage.username = ctx.json.user || storage.username;
    storage.password = ctx.json.pass || storage.password;
    storage.expireAfter = ctx.json.expireAfter || storage.expireAfter;
    storage.saveInterval = ctx.json.saveInterval || storage.saveInterval;

    restartHousekeeping();
    ctx.status = 200;
  });

  router.post("/save", ctx => {
    storage.save();
    ctx.status = 200;
  });

  return router;
}

function makeSessionGuard() {
  return (ctx, next) => {
    let cookie = ctx.cookies.get("daria");
    let isValidCookie = cookie in storage.cookies
      && getTimeDiffMins(new Date(), storage.cookies[cookie].since) <= storage.expireAfter;

    let isAuthRequest = ctx.method == "POST" && ctx.URL.pathname == "/auth";

    if (isValidCookie) {
      if (storage.refreshCookies)
        storage.cookies[cookie].since = new Date();
      return next();
    }
    else if (isAuthRequest)
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
    saveInterval: 5 * 60, // Every 5 minutes
    refreshCookies: true,
    cookies: {}
  };

  const storageManager = pluginManager.getPlugin("storage-mgr");
  let storage = storageManager.getStorage("auth", defaultStorage);
  storage.load();

  for (let cookie in storage.cookies)
    storage.cookies[cookie].since = new Date(storage.cookies[cookie].since)

  return storage;
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
  if (cookie in storage.cookies) {
    delete storage.cookies[cookie];
    isDirty = true;
  }
}

function saveStorage() {
  if (isDirty) {
    storage.save();
    isDirty = false;
  }
}

function vacuum() {
  if (Object.keys(storage.cookies).length == 0)
    return;

  let now = new Date();
  for (const cookie in storage.cookies)
    if (getTimeDiffMins(now, storage.cookies[cookie].since) > storage.expireAfter)
      delete storage.cookies[cookie];

  console.log(`Vacuumed sessions, ${Object.keys(storage.cookies).length} left`)
  storage.save();

  isDirty = false;
}

function getTimeDiffMins(a, b) {
  return (a - b) / 1000 / 60;
}

function restartHousekeeping() {
  clearInterval(vacuumId);
  clearInterval(saveId);

  vacuum();

  vacuumId = setInterval(vacuum, storage.expireAfter * 60 * 1000);
  saveId = setInterval(saveStorage, storage.saveInterval * 1000);
}

module.exports = {
  init(ctx) {
    storage = loadStorage(ctx.pluginManager);
    ctx.router = makeEndpoints();
    ctx.koa.use(makeSessionGuard());

    restartHousekeeping();

    const uiManager = ctx.pluginManager.getPlugin("ui");
    const settingsUrl = "/settings/login";

    uiManager.addCardsBuilder(ctx => {
      if (ctx.url == settingsUrl)
        return {
          scripts: ["/plugins/login-mgr/loader.js"],
          styles: ["/plugins/login-mgr/styles.css"],
          templates: {
            "settings": "login-mgr/html/settings.html",
            "sessions": "login-mgr/html/sessions.html"
          }
        };
    });

    uiManager.addSidebarBuilder(ctx => {
      if (ctx.hint == "daria:settings") {
        let sidebar = {
          name: "Login manager",
          items: []
        };

        if (ctx.url != settingsUrl)
          sidebar.items.push({
            name: "Settings",
            url: settingsUrl
          });

        if (ctx.actions.includes("login:end-all-sessions"))
          sidebar.items.push({
            name: "End all sessions",
            action: "login:end-all-sessions"
          });

        return sidebar;
      }
    });

    uiManager.addDataProvider(settingsUrl, ctx => {
      let cookies = structuredClone(storage.cookies);
      cookies[ctx.cookies.get("daria")].self = true;

      return [
        {
          type: "settings",
          username: storage.username,
          expireAfter: storage.expireAfter,
          saveInterval: storage.saveInterval
        },
        {
          type: "sessions",
          cookies
        }
      ];
    });
  }
}