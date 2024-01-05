daria.builders["settings"] = (fragment, ctx) => {
  let form = fragment.getElementById("form");

  let inputUsername = fragment.getElementById("user");
  inputUsername.value = ctx.username;

  let inputPassword = fragment.getElementById("newPass");
  let inputPasswordAgain = fragment.getElementById("newPassAgain");

  let inputExpireAfter = fragment.getElementById("expireAfter");
  inputExpireAfter.value = ctx.expireAfter;

  let inputSaveInterval = fragment.getElementById("saveInterval");
  inputSaveInterval.value = ctx.saveInterval;
  
  let submit = fragment.getElementById("submit");

  form.onsubmit = event => {
    inputUsername.classList.remove("error");

    inputPassword.parentElement.classList.remove("error");

    inputExpireAfter.classList.remove("error");
    inputSaveInterval.classList.remove("error");

    submit.classList.remove("error");
    submit.innerText = "Saving...";

    if (inputPassword.value && inputPassword.value != inputPasswordAgain.value) {
      inputPassword.parentElement.classList.add("error");
      submit.classList.add("error");
      submit.innerText = "Passwords don't match";
    }
    else if (inputExpireAfter.value == 0) {
      inputExpireAfter.classList.add("error");
      submit.classList.add("error");
      submit.innerText = "Expire after is zero";
    }
    else if (inputSaveInterval.value == 0) {
      inputSaveInterval.classList.add("error");
      submit.classList.add("error");
      submit.innerText = "Save interval is zero";
    }
    else {
      postAjax("/api/auth/settings", {
        user: inputUsername.value,
        pass: inputPassword.value ? inputPassword.value : undefined,
        expireAfter: inputExpireAfter.value,
        saveInterval: inputSaveInterval.value,
      }, xhr => {
        if (xhr.readyState == 4) {
          if (xhr.status == 200)
            submit.innerText = "Apply";
          else {
            submit.classList.add("error");
            if (xhr.status == 400) {
              const response = xhr.response;
              switch (response.result) {
                case "err_user":
                  submit.innerText = "Invalid username";
                  inputUsername.classList.add("error");
                  break;
                case "err_pass":
                  submit.innerText = "Invalid password";
                  inputPassword.classList.add("error");
                  break;
                case "err_expire_after":
                  submit.innerText = "Invalid expire after";
                  inputExpireAfter.classList.add("error");
                  break;
                case "err_save_interval":
                  submit.innerText = "Invalid save interval";
                  inputSaveInterval.classList.add("error");
                  break;
              }
            } else
              submit.innerText = "Failed to apply";
          }
        }
      });
    }

    event.preventDefault();
  };

  let saveState = fragment.getElementById("save");
  saveState.onclick = () => {
    saveState.classList.remove("error");
    saveState.innerText = "Saving...";
    
    postAjax("/api/auth/save", {}, xhr => {
      if (xhr.readyState == 4 && xhr.status == 200)
        saveState.innerText = "Save state to disk";
      else {
        saveState.classList.add("error");
        saveState.innerText = "Failed to save";
      }
    });
  };
};

daria.builders["sessions"] = (fragment, ctx) => {
  let cookies = document.createDocumentFragment();

  let table = fragment.getElementById("cookies")

  for (const cookie in ctx.cookies) {
    let row = document.createElement("tr");

    let cookieCell = document.createElement("td");

    let cookieSpan = document.createElement("span");
    cookieSpan.classList.add("cookie");
    cookieSpan.innerText = cookie;
    cookieCell.appendChild(cookieSpan);

    let self = ctx.cookies[cookie].self;
    if (self) {
      let selfTag = document.createElement("span");
      selfTag.id = "self";
      selfTag.innerText = "\u200B(this session)";
      cookieCell.appendChild(selfTag);
    }

    row.appendChild(cookieCell);

    let sinceCell = document.createElement("td");
    sinceCell.innerText = new Date(ctx.cookies[cookie].since).toLocaleString();
    row.appendChild(sinceCell);

    let endCell = document.createElement("td");

    let endBtn = document.createElement("button");
    endBtn.classList.add("end");
    endBtn.innerText = self ? "Log out" : "End";
    endBtn.onclick = () => {
      if (self)
        daria.actions["daria:logout"]();
      else
        postAjax("/api/auth/logout", { cookie }, xhr => {
          if (xhr.readyState == 4 && xhr.status == 200)
            table.removeChild(row);
        });
    };
    endCell.appendChild(endBtn);

    row.appendChild(endCell);

    cookies.appendChild(row);
  }

  cleanElementAndAppend(table, cookies);
};

daria.actions["login:end-all-sessions"] = () => 
  postAjax("/api/auth/logout", { cookie: "all" }, xhr => {
    if (xhr.readyState == 4 && xhr.status == 200)
      location.href = "/login.html";
  });