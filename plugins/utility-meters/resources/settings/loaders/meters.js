daria.builders["editor"] = (fragment, ctx) => {
  const inputId = fragment.getElementById("inputId")
  const inputName = fragment.getElementById("inputName")
  const inputTariff = fragment.getElementById("inputTariff")

  const saveMeter = fragment.getElementById("saveMeter")
  const saveReading = fragment.getElementById("saveReading")
  fragment.getElementById("meterEditor").onsubmit = event => {
    const meterPath = inputId.value && event.submitter == saveMeter
      ? "/" + inputId.value
      : "s"

    postAjax("/api/utility-meters/meter" + meterPath, {
      comment: inputName.value,
      tariff: inputTariff.selectedOptions[0].value
    }, xhr => {
      buildCards(false)
    })

    event.preventDefault()
  }

  const readingEditor = fragment.getElementById("readingEditor")
  const inputReading = fragment.getElementById("inputReading")
  const inputDate = fragment.getElementById("inputDate")

  readingEditor.onsubmit = event => {
    postAjax(`/api/utility-meters/meter/${inputId.value}/readings`, {
      reading: Number(inputReading.value),
      date: inputDate.valueAsDate
    }, xhr => {
      buildCards(false)
    })

    event.preventDefault()
  }

  const templateRow = fragment.getElementById("row")

  const table = fragment.getElementById("table")

  const tariffs = {}
  let tariffIndex = 0
  for (const tariff of ctx.tariffs) {
    tariffs[tariff.id] = {
      comment: tariff.comment,
      index: tariffIndex++
    }

    const option = document.createElement("option")
    option.value = tariff.id
    option.innerText = tariff.comment
    inputTariff.appendChild(option)
  }
    
  for (const meter of ctx.meters) {
    const row = templateRow.content.cloneNode(true)

    row.getElementById("id").innerText = meter.id
    row.getElementById("comment").innerText = meter.comment
    row.getElementById("reading").innerText = meter.reading
    row.getElementById("tariff").innerText = `${tariffs[meter.tariff].comment} (# ${meter.tariff})`

    row.getElementById("edit").onclick = () => {
      inputId.value = meter.id
      inputName.value = meter.comment
      inputTariff.selectedIndex = tariffs[meter.tariff].index

      inputReading.value = meter.reading
      inputDate.valueAsDate  = meter.date ? new Date(meter.date) : undefined

      saveMeter.disabled = false
      saveReading.disabled = false
      readingEditor.classList.remove("hidden")
    }

    row.getElementById("delete").onclick = () => {
      if (confirm("Дійсно видалити цей лічильник?"))
        ajax("DELETE", "/api/utility-meters/meter/" + meter.id, undefined, xhr => {
          if (xhr.status == 200)
            buildCards(false)
        })
    }

    table.appendChild(row)
  }
}