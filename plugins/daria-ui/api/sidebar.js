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
    items: []
  };

  if (ctx.url != "/")
    part.items.push({
      name: "Dashboard",
      url: "/"
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