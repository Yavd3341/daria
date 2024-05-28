//
// Daria UI: Cards
//

var builders = [];
var providers = {};

async function build(ctx) {
  let scripts = [];
  let styles = [];
  let head = [];
  let templates = {};

  for (const builder of builders) {
    let part = await builder(ctx);
    if (part) {
      if (part.scripts)
        scripts = scripts.concat(part.scripts);
      if (part.styles)
        styles = styles.concat(part.styles);
      if (part.head)
        head = head.concat(part.head);
      if (part.templates)
        Object.assign(templates, part.templates);
    }
  }

  for (const id in templates)
    templates[id] = "/plugins/" + templates[id];

  for (const style of new Set(styles))
    head.push(`<link rel="stylesheet" href="${style}">`);

  return {
    head: head.join(""),
    scripts: [...new Set(scripts)],
    templates
  };
}

module.exports = {
  init(router) {
    router.post("/cards", async ctx => {
      ctx.json.cookies = ctx.cookies;
      let data = ctx.json.url in providers ? await providers[ctx.json.url](ctx.json) : [];
      ctx.body = ctx.query["res"]
        ? { data, ...await build(ctx.json) }
        : { data };
    });
  },

  addBuilder(builder) {
    builders.push(builder);
  },

  addDataProvider(url, provider) {
    providers[url] = provider;
  }
}