//
// UI functions
//

document.addEventListener("DOMContentLoaded", () => {
  let sidebar = document.getElementById("sidebar")
  for (const element of document.getElementsByClassName("toggle-sidebar"))
    element.onclick = () => sidebar.classList.toggle("visible");
})

function cleanElementAndAppend(parent, child) {
  while (parent.hasChildNodes())
    parent.removeChild(parent.lastChild);
  if (child)
    parent.appendChild(child);
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

function buildSidebar(ctx) {
  let fullCtx = Object.assign({}, ctx, {
    actions: Object.keys(daria.actions || {}),
    url: location.pathname,
    querry: location.search
  });

  return new Promise((resolve, reject) => 
    postAjax("/api/ui/sidebar", fullCtx || {}, recipe => {
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
  
      cleanElementAndAppend(sidebar, newSidebar);
      resolve();
    })
  );
}

function buildCards(ctx, withResourses) {
  let fullCtx = Object.assign({}, ctx, {
    actions: Object.keys(daria.actions || {}),
    url: location.pathname,
    querry: location.search
  });

  let sidebarPromise;

  // Request data with resources
  postAjax(`/api/ui/cards${withResourses ? "?res=1" : ""}`, fullCtx, async recipe => {
    recipe = recipe.response; // Unpack recipe

    if (!recipe)
      return;

    if (withResourses) {
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
          scriptPromises.push(new Promise((resolve, reject) => {
            element.onload = resolve;
            element.onerror = reject;
          }));
          fragment.appendChild(element);
        }
        document.head.appendChild(fragment);
      }

      let mainScriptsPromise = Promise.allSettled(scriptPromises);
      sidebarPromise = mainScriptsPromise.then(() => buildSidebar(hint));
  
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
        cleanElementAndAppend(templates, templatesBuffer);
      }
  
      await mainScriptsPromise;
    }
    
    let cards = document.createDocumentFragment();
    for (const ctx of recipe.data) {
      let element = document.getElementById(ctx.type)?.content.cloneNode(true);

      if (!element)
        continue;

      if (ctx.type in daria.builders)
        daria.builders[ctx.type](element, ctx);
      cards.appendChild(element);
    }

    cleanElementAndAppend(content, cards);

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

        console.log(links)
        if (links.length > 0) {
          for (const link of links) {
            block.removeChild(link);
            newBlock.appendChild(link);
          }
          menu.appendChild(newBlock);
        }
      }

      if (menu.children.length == 0)
        menu.parentNode.removeChild(menu);

      content.appendChild(container);
    }

    cleanElementAndAppend(sidebar);
  });
}

function makeForm(exsistingForm) {
  let form = exsistingForm || document.createElement("form");

  function addTextElement(tag, parent, text) {
    const elem = document.createElement("h1");
    elem.innerText = text;
    parent.appendChild(elem);

    return builders;
  }

  function addTextInputElement(type, parent, id, placeholder, value) {
    const elem = document.createElement("input");

    elem.type = type;
    elem.id = id;

    if (placeholder)
      elem.placeholder = placeholder;

    if (value)
      elem.innerText = value;

    parent.appendChild(elem);

    return builders;
  }

  let builders = {
    addHeading: text => addTextElement("h1", form, text),
    addText: text => addTextElement("p", form, text),

    addTextInput: (id, placeholder, value) => addTextInputElement("text", form, id, placeholder, value),
    addPasswordInput: (id, placeholder, value) => addTextInputElement("password", form, id, placeholder, value),
    addNumberInput: (id, placeholder, value) => addTextInputElement("numeric", form, id, placeholder, value),

    addElement: element => {
      document.appendChild(element);
      return builders;
    },

    build: () => form
  };

  return builders;
}