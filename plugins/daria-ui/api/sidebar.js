//
// Daria UI: Sidebar
//

var builders = [];

function build(ctx) {
  let sidebar = [];
  for (const builder of builders) {
    let part = builder(ctx);
    if (part?.items?.length > 0)
      sidebar.push(part);
  }
  return sidebar;
}

function makeDariaSidebarPart(ctx) {
  let part = {
    name: "Daria",
    items: []
  };

  if (ctx.url != "/")
    part.items.push({
      name: "Dashboard",
      url: "/"
    });

  if (ctx.url != "/settings")
    part.items.push({
      name: "Settings",
      url: "/settings"
    });

  if (ctx.actions && ctx.actions.includes("daria:logout"))
    part.items.push({
      name: "Log out",
      action: "daria:logout"
    });

  return part;
}

module.exports = {
  init(router) {
    this.addBuilder(makeDariaSidebarPart);
    router.post("/sidebar", ctx => {
      ctx.json.cookies = ctx.cookies;
      ctx.body = build(ctx.json);
    });
  },

  addBuilder(builder) {
    builders.push(builder);
  }
}