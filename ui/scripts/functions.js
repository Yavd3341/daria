//
// Common functions
//

function ajax(method, url, data, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.responseType = 'json';
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(data));
  if (callback)
    xhr.onload = () => callback(xhr);
}

function postAjax(url, data, callback) {
  ajax("POST", url, data, callback);
}

function getAjax(url, callback) {
  ajax("GET", url, {}, callback);
}

function buildSidebar(ctx) {
  console.debug(ctx)
  postAjax("/api/ui/sidebar", ctx || {}, recipe => {
    recipe = recipe.response; // Unpack recipe
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

var daria = {
  actions: {}
};