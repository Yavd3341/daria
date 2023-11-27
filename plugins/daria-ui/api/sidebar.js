//
// Daria UI: Sidebar
//

var sidebarBuilders = [];

function buildSidebar(ctx) {
  let sidebar = [];
  for (const builder of sidebarBuilders) {
    let part = builder(ctx);
    if (part)
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
    this.addSidebarBuilder(makeDariaSidebarPart);
    router.post("/sidebar", ctx => {
      ctx.body = buildSidebar(ctx.json);
    });
  },

  addSidebarBuilder(builder) {
    sidebarBuilders.push(builder);
  }
}