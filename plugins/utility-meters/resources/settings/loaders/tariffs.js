daria.builders["editor"] = (fragment, ctx) => {
  const tariffsContainer = fragment.getElementById("tariffs")
  const tariffEditor = fragment.getElementById("tariffEditor")

  const inputId = fragment.getElementById("inputId")
  const inputName = fragment.getElementById("inputName")

  const saveTariff = fragment.getElementById("saveTariff")
  tariffEditor.onsubmit = event => {
    const tariffPath = inputId.value && event.submitter == saveTariff
      ? "/" + inputId.value
      : "s"

    postAjax("/api/utility-meters/tariff" + tariffPath, {
      comment: inputName.value
    }, xhr => {
      buildCards(false)
    })

    event.preventDefault()
  }

  const priceEditor = fragment.getElementById("priceEditor")
  const inputPrice = fragment.getElementById("inputPrice")
  const inputDate = fragment.getElementById("inputDate")
  const savePrice = fragment.getElementById("savePrice")

  priceEditor.onsubmit = event => {
    postAjax(`/api/utility-meters/tariff/${inputId.value}/values`, {
      date: inputDate.valueAsDate,
      price: Number(inputPrice.value.replace(/[,.]/, ''))
    }, xhr => {
      buildCards(false)
    })

    event.preventDefault()
  }

  const templateRow = fragment.getElementById("row")
  const templateTariff = fragment.getElementById("tariff")

  for (const tariff of ctx.tariffs) {
    const tariffCard = templateTariff.content.cloneNode(true)

    const heading = tariffCard.getElementById("heading")
    heading.children[0].innerText= `Tariff "${tariff.comment}" (# ${tariff.id})`
      
    heading.children[1].onclick = () => {
      inputId.value = tariff.id
      inputName.value = tariff.comment

      inputPrice.value = ""
      inputDate.valueAsDate  = undefined

      saveTariff.disabled = false
      savePrice.disabled = false
      priceEditor.classList.remove("hidden")
    }
  
    heading.children[2].onclick = () => {
      if (confirm("Дійсно видалити цей тариф?"))
        ajax("DELETE", "/api/utility-meters/tariff/" + tariff.id, undefined, xhr => {
          if (xhr.status == 200)
            buildCards(false)
        })
    }
  
    const table = tariffCard.getElementById("table")
      
    for (const entry of tariff.history) {
      const row = templateRow.content.cloneNode(true)
  
      const date = new Date(entry.date)
      row.getElementById("date").innerText = date.valueOf() - new Date(0).valueOf() > 0
        ? date.toLocaleDateString(undefined, options)
        : "Unknown"
  
      row.getElementById("price").innerText = (entry.price / 100).toLocaleString("uk-UA",{style:"currency", currency:"UAH"})
  
      row.getElementById("edit").onclick = () => {
        inputId.value = tariff.id
        inputName.value = tariff.comment
  
        inputPrice.value = entry.price / 100
        inputDate.valueAsDate  = entry.date ? new Date(entry.date) : undefined
  
        saveTariff.disabled = false
        savePrice.disabled = false
        priceEditor.classList.remove("hidden")
      }
  
      table.appendChild(row)
    }

    tariffsContainer.appendChild(tariffCard)
  }
}