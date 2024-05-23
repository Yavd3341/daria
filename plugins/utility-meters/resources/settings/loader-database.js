daria.builders["editor"] = (fragment, ctx) => {
  const form = fragment.getElementById("settingsForm")

  const inputHost = fragment.getElementById("host")
  inputHost.value = ctx.database.host || ""

  const inputPort = fragment.getElementById("port")
  inputPort.value = ctx.database.port || ""

  const inputDatabase = fragment.getElementById("database")
  inputDatabase.value = ctx.database.database || ""

  function getUserFields(user) {
    const userSection = fragment.getElementById(user + "User")
    const inputs = userSection.getElementsByTagName("input")

    const inputUsername = inputs[0]
    inputUsername.value = ctx.users[user] || ""

    const inputPassword = inputs[1]
    if (!inputUsername.value) {
      inputPassword.required = true
      inputPassword.placeholder = inputPassword.placeholder.replace(" new", "")
    }
    
    return { inputUsername, inputPassword }
  }

  const userAdmin = getUserFields("admin")
  const userGatherer = getUserFields("gatherer")
  const userGuest = getUserFields("guest")

  let submit = fragment.getElementById("submit")

  form.onsubmit = event => {
    submit.classList.remove("error")

    submit.innerText = "Saving..."

    postAjax("/api/utility-meters/settings", {
      database: {
        host: inputHost.value,
        password: inputPort.value,
        database: inputDatabase.value,
      },
      credentials: {
        admin: {
          user: userAdmin.inputUsername.value,
          password: userAdmin.inputPassword.value
        },
        gatherer: {
          user: userGatherer.inputUsername.value,
          password: userGatherer.inputPassword.value
        },
        guest: {
          user: userGuest.inputUsername.value,
          password: userGuest.inputPassword.value
        }
      }
    }, xhr => {
      if (xhr.readyState == 4) {
        if (xhr.status == 200)
          buildCards(false)
        else {
          submit.classList.add("error")
          submit.innerText = "Failed to apply"
        }
      }
    })

    event.preventDefault()
  }
}