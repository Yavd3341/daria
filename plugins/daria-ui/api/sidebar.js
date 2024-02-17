//
// Daria UI: Sidebar
//

var builders = [];

async function build(ctx) {
  let sidebar = [];
  for (const builder of builders) {
    let part = await builder(ctx);
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
    router.post("/sidebar", async ctx => {
      ctx.json.cookies = ctx.cookies;
      ctx.body = await build(ctx.json);
    });
  },

  addBuilder(builder) {
    builders.push(builder);
  }
}