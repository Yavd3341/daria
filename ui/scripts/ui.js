//
// UI functions
//

document.addEventListener("DOMContentLoaded", () => {
  let sidebar = document.getElementById("sidebar")
  for (const element of document.getElementsByClassName("toggle-sidebar"))
    element.onclick = () => sidebar.classList.toggle("visible");
})

function cleanElement(parent) {
  while (parent.hasChildNodes())
    parent.removeChild(parent.lastChild);
}

function actionInvoker(action) {
  return (event) => {
    if (action in daria.actions)
      daria.actions[action](event);
  }
}

function isLinkToRoot(link) {
  return link.pathname == "/" && link.host == location.host;
}

function isSidebarEmpty() {
  if (sidebar.children.length == 0)
    return true;

  if (sidebar.children.length == 1 && isLinkToRoot(sidebar.firstChild.firstChild))
    return true;

  return false;
}

function buildSidebar() {
  let ctx = {
    actions: Object.keys(daria.actions || {}),
    url: location.pathname,
    querry: Object.fromEntries(new URLSearchParams(location.search))
  };

  return new Promise((resolve, reject) => 
    postAjax("/api/ui/sidebar", ctx || {}, recipe => {
      recipe = recipe.response; // Unpack recipe
  
      if (!recipe) {
        resolve();
        return;
      }
  
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
  
              if (itemRecipe.action)
                item.onclick = actionInvoker(itemRecipe.action);
  
              item.href = itemRecipe.url || "#";
              section.appendChild(item);
            }
          }
        }
  
        newSidebar.appendChild(section);
      }
  
      cleanElement(sidebar, newSidebar);
      sidebar.appendChild(newSidebar);

      updateLinks(sidebar);
      resolve();
    })
  );
}

function buildCards(withResourses) {
  let ctx = {
    actions: Object.keys(daria.actions || {}),
    url: location.pathname,
    querry: Object.fromEntries(new URLSearchParams(location.search))
  };

  let sidebarPromise;

  // Request data with resources
  postAjax(`/api/ui/cards${withResourses ? "?res=1" : ""}`, ctx, async recipe => {
    recipe = recipe.response; // Unpack recipe

    if (!recipe)
      return;

    cleanElement(content);

    if (withResourses) {
      let scriptPromises = [];
      let templatePromises = [];

      for (const key in daria.actions)
        if (!daria.persistentActions.includes(key))
          delete daria.actions[key];
      
      daria.builders = {};
  
      document.head.innerHTML = daria.initialHead + (recipe.head || "");
  
      if (recipe.scripts) {
        let loadSequentially = recipe.sync != undefined 
          ? recipe.sync 
          : true;

        if (loadSequentially) {
          scriptPromises = [
            recipe.scripts
              .map(script => () => {
                let element = document.createElement("script");
                element.setAttribute("src", script);
                document.head.appendChild(element);
                return new Promise((resolve, reject) => {
                  element.onload = resolve;
                  element.onerror = resolve;
                });
              })
              .reduce((last, current) => last.then(current), Promise.resolve())
          ];
        }
        else {
          let fragment = document.createDocumentFragment();
          for (const script of recipe.scripts) {
            let element = document.createElement("script");
            element.setAttribute("src", script);
            scriptPromises.push(new Promise((resolve, reject) => {
              element.onload = resolve;
              element.onerror = reject;
            }));
            fragment.appendChild(element);
          }
          document.head.appendChild(fragment);
        }
      }

      let mainScriptsPromise = Promise.allSettled(scriptPromises);
      sidebarPromise = mainScriptsPromise.then(() => buildSidebar());
  
      if (recipe.templates) {
        let templatesBuffer = document.createDocumentFragment();
  
        for (const template in recipe.templates) {
          let tpl = document.createElement("template");
          tpl.id = template;
  
          let promise = new Promise((resolve, reject) => {
            getAjax(recipe.templates[template], xhr => {
              if (xhr.status != 200) {
                reject(xhr.status);
                return;
              }
  
              tpl.innerHTML = xhr.response;
              templatesBuffer.appendChild(tpl);
              resolve();
            })
          });
  
          templatePromises.push(promise);
        }
  
        await Promise.allSettled(templatePromises);
        cleanElement(templates);
        templates.appendChild(templatesBuffer)
      }
  
      await mainScriptsPromise;
    }
    else 
      sidebarPromise = buildSidebar();
    
    let cards = document.createDocumentFragment();
    for (const ctx of recipe.data) {
      let element = document.getElementById(ctx.type)?.content.cloneNode(true);

      if (!element)
        continue;

      let postAction = undefined;
      if (ctx.type in daria.builders)
        postAction = daria.builders[ctx.type](element, ctx);
      
      cards.appendChild(element);

      if (postAction)
        postAction();
    }

    content.appendChild(cards);

    if (content.children.length == 0) {
      await sidebarPromise;

      let container = document.getElementById("menu-container-tpl").content.cloneNode(true);
      let menu = container.getElementById("main");
      for (const block of sidebar.children) {
        let newBlock = document.createElement("div");
        newBlock.classList.add("card");
        let links = [];

        for (const child of block.children) {
          if (child.tagName == "A" && !isLinkToRoot(child))
            links.push(child);
          else {
            let name = document.createElement("h1");
            name.innerText = child.innerText;
            newBlock.appendChild(name);
          }
        }

        if (links.length > 0) {
          for (const link of links) {
            block.removeChild(link);
            newBlock.appendChild(link);
          }
          menu.appendChild(newBlock);
        }
      }

      if (menu.children.length == 0) {
        menu.parentNode.removeChild(menu);
        container.getElementById("heading").innerText = "Nothing here";
      }

      content.appendChild(container);
    }
    else 
      updateLinks(content);

    cleanElement(sidebar);
  });
}

function updateLinks(parent) {
  const links = parent.getElementsByTagName("a");
  for (const link of links) {
    let href = link.getAttribute("href");
    if (link.host == location.host && href && !href.startsWith("#"))
      link.addEventListener('click', function(event) {
        event.preventDefault();
        history.pushState(undefined, undefined, link.href);
        buildCards(true);
      }, false);
  }
}

function makeSPA() {
  daria.initialHead = document.head.innerHTML;
  daria.prevHead = "";

  updateLinks(document.body);
  window.addEventListener("popstate", () => buildCards(true));

  buildCards(true);
}