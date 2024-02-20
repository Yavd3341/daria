daria.builders["settings"] = (fragment, ctx) => {
  // Settings
  {
    const form = fragment.getElementById("settingsForm");

    const inputHost = fragment.getElementById("host");
    inputHost.value = ctx.database.host || "";

    const inputPort = fragment.getElementById("port");
    inputPort.value = ctx.database.port || "";

    const inputDatabase = fragment.getElementById("database");
    inputDatabase.value = ctx.database.database || "";

    function getUserFields(user) {
      const userSection = fragment.getElementById(user + "User");
      const inputs = userSection.getElementsByTagName("input");

      const inputUsername = inputs[0];
      inputUsername.value = ctx.users[user] || "";

      const inputPassword = inputs[1];
      if (!inputUsername.value) {
        inputPassword.required = true;
        inputPassword.placeholder = inputPassword.placeholder.replace(" new", "");
      }
      
      return { inputUsername, inputPassword };
    }

    const userLogin = getUserFields("login");
    const userGatherer = getUserFields("gatherer");
    const userUser = getUserFields("user");

    const toggleUseInternalTimer = fragment.getElementById("useInternalTimer");
    toggleUseInternalTimer.checked = ctx.useInternalTimer;

    let submit = fragment.getElementById("submit");

    form.onsubmit = event => {
      submit.classList.remove("error");
  
      submit.innerText = "Saving...";
  
      postAjax("/api/norma-plus/settings", {
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
            submit.innerText = "Save";
          else {
            submit.classList.add("error");
            submit.innerText = "Failed to apply";
          }
        }
      });
  
      event.preventDefault();
    };
  }

  // Accounts
  {
    const rowTemplate = fragment.getElementById("row");
    const accounts = fragment.getElementById("accounts");

    function addRow(data, parent) {
      const row = rowTemplate.content.cloneNode(true);

      const accountCell = row.getElementById("account");
      accountCell.innerText = data.account;
      row.getElementById("name").innerText = data.name;
      row.getElementById("address").innerText = data.address;

      row.getElementById("delete").onclick = event => {
        if (confirm("This will irreversibly delete all history associated with account!\n\nAre you sure?")) {
          const row = accountCell.parentElement;
          ajax("DELETE", "/api/norma-plus/account/" + data.account, {}, xhr => {
            if (xhr.readyState == 4 && xhr.status == 200)
              row.parentElement.removeChild(row);
          });
        }
      };

      parent.appendChild(row);
    }

    const form = fragment.getElementById("accountEdit");

    const inputAccount = fragment.getElementById("account");
    const inputUser = fragment.getElementById("user");
    const inputPass = fragment.getElementById("pass");

    let saveCreds = fragment.getElementById("saveCreds");

    form.onsubmit = event => {
      saveCreds.classList.remove("error");
  
      saveCreds.innerText = "Saving...";
  
      postAjax("/api/norma-plus/account", {
        account: inputAccount.value,
        username: inputUser.value,
        password: inputPass.value
      }, xhr => {
        if (xhr.readyState == 4) {
          if (xhr.status == 200)
            saveCreds.innerText = "Save";
          else {
            saveCreds.classList.add("error");
            saveCreds.innerText = "Failed to apply";
          }
        }
      });
  
      event.preventDefault();
    };

    const tableFragment = document.createDocumentFragment();
    for (const account of ctx.accounts)
      addRow(account, tableFragment);
    accounts.appendChild(tableFragment);
  }
};