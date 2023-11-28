//
// Daria UI: Cards
//

var builders = [];

function build(ctx) {
  let scripts = [];
  let styles = [];
  let head = [];
  let templates = {};

  for (const builder of builders) {
    let part = builder(ctx);
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
  init(router, storage) {
    router.post("/cards", ctx => {
      if (ctx.query["res"])
        ctx.body = {
          data: storage.dashboard,
          ...build(ctx.json)
        };
      else
        ctx.body = {
          data: storage.dashboard
        };
    });
  },

  addBuilder(builder) {
    builders.push(builder);
  }
}