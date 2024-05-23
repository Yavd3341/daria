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

    let counter = -1
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