//
// UI functions
//

function buildSidebar(ctx) {
  let fullCtx = Object.assign({}, ctx, {
    actions: Object.keys(daria.actions || {}),
    url: location.pathname,
    querry: location.search
  });

  postAjax("/api/ui/sidebar", fullCtx || {}, recipe => {
    recipe = recipe.response; // Unpack recipe

    if (!recipe)
      return;

    let newSidebar = document.createDocumentFragment();
    for (const sectionRecipe of recipe) {
      let section = document.createElement("div");

      if (sectionRecipe.name) {
        let sectionName = document.createElement("span");
        sectionName.innerText = sectionRecipe.name;
        section.appendChild(sectionName);
      }

      if (sectionRecipe.items) {
        for (const itemRecipe of sectionRecipe.items) {
          if (itemRecipe.name) {
            let item = document.createElement("a");
            item.innerText = itemRecipe.name;
            
            if (itemRecipe.action && itemRecipe.action in daria.actions) {
              item.onclick = daria.actions[itemRecipe.action];
            }

            item.href = itemRecipe.url || "#";
            section.appendChild(item);
          }
        }
      }

      newSidebar.appendChild(section);
    }
    
    while (sidebar.hasChildNodes())
      sidebar.removeChild(sidebar.lastChild);
    sidebar.appendChild(newSidebar);
  });
}

function buildCards(ctx, withResourses) {
  let fullCtx = Object.assign({}, ctx, {
    actions: Object.keys(daria.actions || {}),
    url: location.pathname,
    querry: location.search
  });

  // Request data with resources
  postAjax(`/api/ui/cards${withResourses ? "?res=1" : ""}`, fullCtx, async recipe => {
    recipe = recipe.response; // Unpack recipe

    if (!recipe)
      return;

      let scriptPromises = []
      let templatePromises = []

    if (recipe.head) {
      let headFragment = document.createElement("template");
      headFragment.innerHTML = recipe.head;
      document.head.appendChild(headFragment.content);
    }

    if (recipe.scripts) {
      let fragment = document.createDocumentFragment();
      for (const script of recipe.scripts) {
        let element = document.createElement("script");
        element.setAttribute("src", script);
        scriptPromises.push(new Promise((resolve, reject) => element.onload = resolve));
        fragment.appendChild(element);
      }
      document.head.appendChild(fragment);
    }

    if (recipe.templates) {
      let templates = document.createDocumentFragment();
      let ctxs = []

      for (const template in recipe.templates) {
        let tpl = document.createElement("template");
        tpl.id = template;

        let promise = new Promise((resolve, reject) => {
          getAjax(recipe.templates[template], xhr => {
            tpl.innerHTML = xhr.response;
            templates.appendChild(tpl);
            resolve();
          })
        });

        templatePromises.push(promise);
      }

      await Promise.allSettled(templatePromises);
      while (main.hasChildNodes())
        main.removeChild(main.lastChild);
      main.appendChild(templates);

      await Promise.allSettled(scriptPromises);
      let cards = document.createDocumentFragment();
      for (const ctx of recipe.data) {
        let element = document.getElementById(ctx.type).content.cloneNode(true);
        if (ctx.type in daria.builders)
          daria.builders[ctx.type](element, ctx);
        cards.appendChild(element);
      }
      main.appendChild(cards);
    }
  });
}