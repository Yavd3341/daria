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

daria.builders["quick"] = (card, ctx) => {
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
};

daria.builders["balance-history"] = (card, ctx) => {
  const canvas = card.getElementById("canvas");
  return () => {
    new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Balance",
            data: ctx.data,
            stepped: true
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
  };
};