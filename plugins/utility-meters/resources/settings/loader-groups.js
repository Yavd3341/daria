daria.builders["editor"] = (fragment, ctx) => {
  const groupsContainer = fragment.getElementById("groups")
  const groupEditor = fragment.getElementById("groupEditor")

  const inputId = fragment.getElementById("inputId")
  const inputName = fragment.getElementById("inputName")

  const saveGroup = fragment.getElementById("saveGroup")
  groupEditor.onsubmit = event => {
    const groupPath = inputId.value && event.submitter == saveGroup
      ? "/" + inputId.value
      : "s"

    postAjax("/api/utility-meters/group" + groupPath, {
      comment: inputName.value
    }, xhr => {
      buildCards(false)
    })

    event.preventDefault()
  }

  const meterEditor = fragment.getElementById("meterEditor")
  const inputMeter = fragment.getElementById("inputMeter")
  const addMeter = fragment.getElementById("addMeter")

  meterEditor.onsubmit = event => {
    postAjax(`/api/utility-meters/group/${inputId.value}/meters/${Number(inputMeter.selectedOptions[0].value)}`, {}, xhr => {
      buildCards(false)
    })

    event.preventDefault()
  }

  const meters = {}
  let meterIndex = 0
  for (const meter of ctx.meters) {
    meters[meter.id] = {
      comment: meter.comment,
      index: meterIndex++
    }

    const option = document.createElement("option")
    option.value = meter.id
    option.innerText = meter.comment
    inputMeter.appendChild(option)
  }

  const templateRow = fragment.getElementById("row")
  const templateGroup = fragment.getElementById("group")

  for (const group of ctx.groups) {
    const groupCard = templateGroup.content.cloneNode(true)

    const heading = groupCard.getElementById("heading")
    heading.children[0].innerText= `Group "${group.comment}" (# ${group.id})`
      
    heading.children[1].onclick = () => {
      inputId.value = group.id
      inputName.value = group.comment

      let noMeters = true
      inputMeter.selectedIndex = undefined
      for (const meter of inputMeter.options) {
        const id = Number(meter.value)
        if (group.meters.includes(id)) 
          meter.classList.toggle("hidden", true)
        else {
          meter.classList.toggle("hidden", false)
          inputMeter.selectedIndex = inputMeter.selectedIndex == undefined 
            ? meters[id].index 
            : inputMeter.selectedIndex
          noMeters = false
        }
      }

      saveGroup.disabled = false
      addMeter.disabled = false
      meterEditor.classList.toggle("hidden", noMeters)
    }
  
    heading.children[2].onclick = () => {
      if (confirm("Дійсно видалити цю групу?"))
        ajax("DELETE", "/api/utility-meters/group/" + group.id, undefined, xhr => {
          if (xhr.status == 200)
            buildCards(false)
        })
    }
  
    const table = groupCard.getElementById("table")
      
    for (const meter of group.meters) {
      const row = templateRow.content.cloneNode(true)
  
      row.getElementById("id").innerText = meter
      row.getElementById("comment").innerText = meters[meter].comment
  
      row.getElementById("remove").onclick = () => {
        if (confirm("Дійсно прибрати цей лічильник з групи?"))
          ajax("DELETE", `/api/utility-meters/group/${group.id}/meters/${meter}`, undefined, xhr => {
            if (xhr.status == 200)
              buildCards(false)
          })
      }
  
      table.appendChild(row)
    }

    groupsContainer.appendChild(groupCard)
  }
}