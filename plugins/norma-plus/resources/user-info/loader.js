function fillField(card, id, value) {
  let cell = card.getElementById(id);

  if (value != undefined && value.toString().trim().length > 0)
    cell.innerText = value;
  else {
    let line = cell.parentElement;
    line.parentElement.removeChild(line);
  }
}

daria.builders["user-info"] = (card, ctx) => {
  fillField(card, "account", ctx.account);
  fillField(card, "name", ctx.name);
  fillField(card, "address", ctx.address);

  let phones = document.createDocumentFragment();
  for (const phone of ctx.phones) {
    let elem = document.createElement("a");
    elem.href = "tel:" + phone;
    elem.innerText = phone;
    phones.appendChild(elem);
  }

  card.getElementById("phones").appendChild(phones);
};