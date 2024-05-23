daria.builders["heading"] = (fragment, ctx) => {
  if (ctx.title)
    fragment.getElementById("heading").innerText += ": " + ctx.title
}

daria.builders["table"] = (fragment, ctx) => {
  const table = fragment.getElementById("table")
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }

  let onlyDates = true
  let noTariff = true
  for (const entry of ctx.data) {
    const row = document.createElement("tr")

    {
      const cell = document.createElement("td")

      if (entry.comment) {
        cell.innerText = entry.comment
        onlyDates = false
      }
      else {
        const date = new Date(entry.date)
        const isDateOnly = date.getHours() == 0 && date.getMinutes() == 0 && date.getSeconds() == 0
        cell.innerText = date.toLocaleDateString(undefined, options) + (!isDateOnly 
          ? "<br/>" + date.toLocaleTimeString()
          : "")
      }

      if (entry.meter) {
        const link = document.createElement("a")
        link.href = "?meter=" + entry.meter
        link.innerText = cell.innerText
        cell.removeChild(cell.lastChild)
        cell.appendChild(link)
      }

      row.appendChild(cell)
    }

    {
      const cell = document.createElement("td")
      cell.innerText = entry.reading == undefined
        ? entry.sum
        : entry.reading

      if (entry.difference) {
        const diffSpan = document.createElement("span")
        diffSpan.innerText = entry.difference
        diffSpan.setAttribute("data-value", entry.difference)
        diffSpan.classList.add("difference")
        cell.appendChild(diffSpan)
      }

      row.appendChild(cell)
    }

    if (entry.tariff != undefined) {
      const cell = document.createElement("td")
      cell.innerText = (entry.tariff / 100).toLocaleString("uk-UA",{style:"currency", currency:"UAH"})
      row.appendChild(cell)
      noTariff = false
    }

    {
      const cell = document.createElement("td")

      const span = document.createElement("span")
      span.innerText = entry.cost != null
        ? (entry.cost / 100).toLocaleString("uk-UA",{style:"currency", currency:"UAH"})
        : "N/A"
      cell.appendChild(span)

      if (entry.cost_difference) {
        const diffSpan = document.createElement("span")
        diffSpan.innerText = (entry.cost_difference / 100).toLocaleString("uk-UA",{style:"currency", currency:"UAH"})
        diffSpan.setAttribute("data-value", entry.cost_difference)
        diffSpan.classList.add("difference", "money")
        cell.appendChild(diffSpan)
      }

      row.appendChild(cell)
    }

    table.appendChild(row)
  }

  const headRow = fragment.getElementById("head-row")
  if (!onlyDates)
    headRow.children[0].innerText = "Comment"

  if (noTariff)
    headRow.removeChild(headRow.children[2])

  const heading = fragment.getElementById("heading")
  if (ctx.title)
    heading.innerText = ctx.title
  else
    heading.parentElement.removeChild(heading)
}