//
// Login manager
//

const Router = require("@koa/router");

function makeEndpoints() {
  const router = new Router();

  router.prefix("/auth")

  router.post("/", ctx => {
    if (ctx.json.user == "admin") {
      if (ctx.json.pass == "admin") {
        ctx.status = 200;
        ctx.cookies.set("daria", "daria");
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
    ctx.cookies.set("daria", undefined);
  });

  return router;
}

function makeSessionGuard() {
  return (ctx, next) => {
    if (ctx.cookies.get("daria") == "daria" 
    || (ctx.method == "POST" && ctx.URL.pathname == "/auth"))
      return next();
    else
      ctx.status = 401;
  }
}

module.exports = {
  init(ctx) {
    ctx.router = makeEndpoints();
    ctx.koa.use(makeSessionGuard());
  }
}