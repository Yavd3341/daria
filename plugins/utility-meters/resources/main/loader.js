daria.builders["heading"] = (fragment, ctx) => {
  if (ctx.title)
    fragment.getElementById("heading").innerText += ": " + ctx.title
}

daria.builders["graph"] = (fragment, ctx) => {
  const canvas = fragment.getElementById("canvas")
  const changeGraphBtn = fragment.getElementById("change-graph")
  const graphHeading = fragment.getElementById("graph-heading").children[0]

  for (let entry of ctx.data) {
    if (entry.cost)
      entry.cost = (entry.cost / 100).toFixed(2)
    if (entry.cost_difference)
      entry.cost_difference = (entry.cost_difference / 100).toFixed(2)
  }

  return () => {
    const chart = new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            fill: true,
            data: ctx.data
          }
        ]
      },
      options: {
        responsive: true,
        parsing: {
          xAxisKey: "date",
          yAxisKey: "difference"
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: "month",
              displayFormats: {
                month: {
                    year: "numeric",
                    month: "long",
                  }
              },
              tooltipFormat: {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            }
          },
          y: {
            beginAtZero: true
          }
        }
      }
    })

    function updateColors() {
      const css = getComputedStyle(document.body)

      chart.data.datasets[0].borderColor = css.getPropertyValue("--col-accent")
      
      const textColor = css.getPropertyValue("--col-fg")
      chart.options.scales.x.ticks.color = textColor
      chart.options.scales.y.ticks.color = textColor
      
      const gridColor = css.getPropertyValue("--col-grid")
      chart.options.scales.x.grid.color = gridColor
      chart.options.scales.y.grid.color = gridColor

      chart.update()
    }

    window
      .matchMedia?.("(prefers-color-scheme: dark)")
      .addEventListener("change", updateColors)
    updateColors()

    let counter = ctx.fields.length
    changeGraphBtn.onclick = () => {
      counter = ++counter % ctx.fields.length

      chart.options.parsing.yAxisKey = ctx.fields[counter].field
      graphHeading.innerText = "Graph: " + ctx.fields[counter].name
      
      if (ctx.fields[counter].type == "money")
        chart.options.plugins.tooltip.callbacks.label = value => value.parsed.y.toLocaleString("uk-UA",{
          style:"currency",
          currency:"UAH"
        })
      else
        chart.options.plugins.tooltip.callbacks.label = undefined

      chart.update()
    }
    changeGraphBtn.onclick()
  }
}

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
        const isDateOnly = date.getHours() == 0 && date.getMinutes() == 0 && date.getSeconds() == 0;
        cell.innerText = date.toLocaleDateString(undefined, options) + (!isDateOnly 
          ? "<br/>" + date.toLocaleTimeString()
          : "");
      }

      if (entry.meter) {
        const link = document.createElement("a")
        link.href = "meter/" + entry.meter
        link.innerText = cell.innerText
        cell.removeChild(cell.lastChild)
        cell.appendChild(link)
      }

      row.appendChild(cell)
    }

    {
      const cell = document.createElement("td")
      cell.innerText = entry.reading

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
    }

    {
      const cell = document.createElement("td")

      const span = document.createElement("span")
      span.innerText = (entry.cost / 100).toLocaleString("uk-UA",{style:"currency", currency:"UAH"})
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

  if (!onlyDates)
    fragment.getElementById("head-row").children[0].innerText = "Comment"
}