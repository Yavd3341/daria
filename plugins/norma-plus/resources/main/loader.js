function fillMonthCosts(table, monthData) {
  let costSum = 0;

  function buildRow(name, cost, parent) {
    let row = document.createElement("tr");

    let cell = document.createElement("td");
    cell.innerText = name;
    row.appendChild(cell);

    cell = document.createElement("td");
    cell.innerText = cost;
    cell.classList.add("money");
    row.appendChild(cell);

    parent.appendChild(row);
    return row;
  }

  let tableBody = document.createElement("tbody");
  monthData.forEach(spending => {
    buildRow(spending.name, spending.cost, tableBody);
    costSum += spending.cost;
  });
  table.appendChild(tableBody);

  let tableFooter = document.createElement("tfoot");
  buildRow("Total", costSum, tableFooter);
  table.appendChild(tableFooter);

  return costSum;
}

function fillField(card, id, value) {
  let cell = card.getElementById(id);

  if (value != undefined && value.toString().trim().length > 0)
    cell.innerText = value;
  else {
    let line = cell.parentElement;
    line.parentElement.removeChild(line);
  }
}

daria.builders["main"] = (card, ctx) => {
  // Load user info
  fillField(card, "account", ctx.userInfo.account);
  fillField(card, "name", ctx.userInfo.name);
  fillField(card, "address", ctx.userInfo.address);

  let phones = document.createDocumentFragment();
  for (const phone of ctx.userInfo.phones) {
    let elem = document.createElement("a");
    elem.href = "tel:" + phone;
    elem.innerText = phone;
    phones.appendChild(elem);
  }

  card.getElementById("phones").appendChild(phones);

  // Load top cards
  // Current spendings
  fillMonthCosts(card.getElementById("costs-current"), ctx.currentMonth);

  // Next month spendings
  let costSum = fillMonthCosts(card.getElementById("costs-next"), ctx.nextMonth);

  // Current balance
  const balance = card.getElementById("balance");
  balance.innerText = ctx.balance;

  const balanceMonths = Math.floor(ctx.balance / costSum);
  const auxInfo = card.getElementById("aux");
  if (balanceMonths < 0) {
    balance.classList.add("negative");
    auxInfo.innerText = "(payment required)"
  }
  else if (balanceMonths == 0) {
    balance.classList.add("warning");
    auxInfo.innerText = "(payment advised)"
  }
  else
    auxInfo.innerText = `(up to ${balanceMonths} month${balanceMonths > 1 ? "s" : ""})`;

  // Load balance
  const canvas = card.getElementById("canvas");

  let chartData = [];
  let chartAccum = ctx.balance;
  let chartLastDate = undefined;

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  let log = document.createDocumentFragment();
  function buildRow(date, comment, amount) {
    let row = document.createElement("tr");

    let cell = document.createElement("td");
    let isDateOnly = date.getHours() == 0 && date.getMinutes() == 0 &&date.getSeconds() == 0;
    cell.innerHTML = date.toLocaleDateString(undefined, options) + (!isDateOnly 
      ? "<br/>" + date.toLocaleTimeString()
      : "");
    row.appendChild(cell);

    cell = document.createElement("td");
    cell.innerText = amount;
    cell.classList.add("money");
    if (amount < 0) cell.classList.add("negative");
    row.appendChild(cell);

    cell = document.createElement("td");
    cell.innerText = comment;
    row.appendChild(cell);

    log.appendChild(row);
  }

  for (const entry of ctx.data) {
    let date = new Date(entry.date);
    buildRow(date, entry.comment, entry.amount);

    date.setHours(0, 0, 0, 0);

    if (!chartLastDate || chartLastDate.valueOf() != date.valueOf()) {
      chartLastDate = date
      chartData.push({
        x: date,
        y: chartAccum
      });
    }
    
    chartAccum -= entry.amount;
  }
  card.getElementById("log").appendChild(log);

  return () => {
    const chart = new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Balance",
            data: chartData,
            stepped: "after"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            type: 'time'
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });

    function updateColors() {
      const css = getComputedStyle(document.body);

      chart.data.datasets[0].borderColor = css.getPropertyValue("--col-accent");
      
      const textColor = css.getPropertyValue("--col-fg");
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.y.ticks.color = textColor;
      
      const gridColor = css.getPropertyValue("--col-grid");
      chart.options.scales.x.grid.color = gridColor;
      chart.options.scales.y.grid.color = gridColor;

      chart.update();
    }

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", updateColors);
    updateColors();
  };
};