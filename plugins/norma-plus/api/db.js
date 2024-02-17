function resolvePaymentsData(data, addLeftover) {
  let spendings = [];
  let payments = [];

  let lastMonth = new Date(); // Get current date and time
  lastMonth.setHours(0, 0, 0, 0); // Reset time to midnight
  lastMonth.setMonth(lastMonth.getMonth(), 1); // Reset date to 1st of the next month


  for (let i = data.length - 2; i >= 0; i--) {
    const month = data[i];

    if (month.payments?.length > 0) {
      payments.push(month.payments);

      date = month.payments[0].date;
      lastMonth.setFullYear(date.getFullYear(), date.getMonth(), 1);
    } 
    
    if (i == 0 && addLeftover)
      payments.push({
        date: lastMonth,
        source: "Initial amount",
        amount: month.prevBalance
      });

    spendings.push(
      month.spendings.map(
        spending => ({
          date: new Date(lastMonth),
          name: spending.name,
          cost: spending.cost
        })
      )
    );

    lastMonth.setMonth(lastMonth.getMonth() - 1);
  }

  return { spendings: spendings.flat(), payments: payments.flat() }
}

function mergeBalanceLog(data) {
  return [
    ...data.spendings.map(entry => ({
      date: entry.date,
      amount: -entry.cost,
      comment: entry.name
    })),
    ...data.payments.map(entry => ({
      date: entry.date,
      amount: entry.amount,
      comment: entry.source
    }))
  ].sort((a, b) => b.date - a.date);
}

module.exports = {
  resolvePaymentsData,
  mergeBalanceLog
};