function fillField(card, id, value) {
  let cell = card.getElementById(id);

  if (value != undefined && value.toString().trim().length > 0)
    cell.innerText = value;
  else {
    let line = cell.parentElement;
    line.parentElement.removeChild(line);
  }
}

daria.builders["plugin"] = (card, ctx) => {
  card.getElementById("name").innerText = ctx.name;

  let idElement = card.getElementById("id")
  idElement.innerText = ctx.id;
  idElement.title = ctx.entry || "No entry";

  fillField(card, "version", ctx.version);
  fillField(card, "author", ctx.author);

  fillField(card, "coverage", ctx.coverage?.join("\n"));
  fillField(card, "dependencies", ctx.dependencies?.join("\n"));
};