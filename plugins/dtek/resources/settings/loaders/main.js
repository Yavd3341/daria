daria.builders["page"] = (fragment, ctx) => {
  // Settings
  {
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

    const userLogin = getUserFields("login")
    const userGatherer = getUserFields("gatherer")
    const userUser = getUserFields("user")

    const toggleUseInternalTimer = fragment.getElementById("useInternalTimer")
    toggleUseInternalTimer.checked = ctx.useInternalTimer

    let submit = fragment.getElementById("submit")

    form.onsubmit = event => {
      submit.classList.remove("error")
  
      submit.innerText = "Saving..."
  
      postAjax("/api/dtek/settings", {
        database: {
          host: inputHost.value,
          password: inputPort.value,
          database: inputDatabase.value,
        },
        credentials: {
          login: {
            user: userLogin.inputUsername.value,
            password: userLogin.inputPassword.value
          },
          gatherer: {
            user: userGatherer.inputUsername.value,
            password: userGatherer.inputPassword.value
          },
          user: {
            user: userUser.inputUsername.value,
            password: userUser.inputPassword.value
          }
        },
        useInternalTimer: toggleUseInternalTimer.checked
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

  // Accounts
  {
    const form = fragment.getElementById("loginEdit")

    const inputLogin = fragment.getElementById("login")
    const inputPass = fragment.getElementById("pass")
    const inputPerson = fragment.getElementById("personal")

    let saveCreds = fragment.getElementById("saveCreds")

    form.onsubmit = event => {
      saveCreds.classList.remove("error")
  
      saveCreds.innerText = "Saving..."
  
      postAjax("/api/dtek/login", {
        login: inputLogin.value,
        isPerson: inputPerson.checked,
        password: inputPass.value
      }, xhr => {
        if (xhr.readyState == 4) {
          if (xhr.status == 200)
            buildCards(false)
          else {
            saveCreds.classList.add("error")
            saveCreds.innerText = "Failed to apply"
          }
        }
      })
  
      event.preventDefault()
    }

    const rowTemplate = fragment.getElementById("row")
    const logins = fragment.getElementById("logins")
    for (const login of ctx.logins){
      const row = rowTemplate.content.cloneNode(true)

      const loginCell = row.getElementById("loginCell")
      loginCell.innerText = login.login
      row.getElementById("personalCell").innerText = login.is_person

      row.getElementById("delete").onclick = event => {
        if (confirm("This will irreversibly delete all history associated with login!\n\nAre you sure?")) {
          const row = loginCell.parentElement
          ajax("DELETE", "/api/dtek/login", {
            login: login.login,
            isPerson: login.is_person
          }, xhr => {
            if (xhr.readyState == 4 && xhr.status == 200)
              row.parentElement.removeChild(row)
          })
        }
      }

      logins.appendChild(row)
    }
  }
}