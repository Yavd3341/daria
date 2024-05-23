daria.builders["table"] = (fragment, ctx) => {
  const table = fragment.getElementById("table")
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }

  let onlyDates = true
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
        cell.innerText = date.valueOf() - new Date(0).valueOf() > 0
          ? date.toLocaleDateString(undefined, options)
          : "Unknown"
      }

      row.appendChild(cell)
    }

    {
      const cell = document.createElement("td")

      const span = document.createElement("span")
      span.innerText = (entry.value / 100).toLocaleString("uk-UA",{style:"currency", currency:"UAH"})
      cell.appendChild(span)

      if (entry.difference) {
        const diffSpan = document.createElement("span")
        diffSpan.innerText = (entry.difference / 100).toLocaleString("uk-UA",{style:"currency", currency:"UAH"})
        diffSpan.setAttribute("data-value", entry.difference)
        diffSpan.classList.add("difference", "money")
        cell.appendChild(diffSpan)
      }

      row.appendChild(cell)
    }

    table.appendChild(row)
  }

  const headRow = fragment.getElementById("head-row")
  headRow.children[0].innerText = onlyDates ? "Date" : "Comment"
  headRow.children[1].innerText = "Price"
}