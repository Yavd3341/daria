daria.builders["page"] = (fragment, ctx) => {
  const rowTemplate = fragment.getElementById("row")
  const accounts = fragment.getElementById("accounts")
  for (const account of ctx.accounts){
    const row = rowTemplate.content.cloneNode(true)

    const accountCell = row.getElementById("account")
    accountCell.innerText = account.account
    row.getElementById("address").innerText = account.address

    row.getElementById("delete").onclick = event => {
      if (confirm("This will irreversibly delete all history associated with account!\n\nAre you sure?")) {
        const row = accountCell.parentElement
        ajax("DELETE", "/api/dtek/account/" + account.account, {}, xhr => {
          if (xhr.readyState == 4 && xhr.status == 200)
            row.parentElement.removeChild(row)
        })
      }
    }

    accounts.appendChild(row)
  }
}