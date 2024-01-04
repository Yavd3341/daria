daria.builders["settings"] = (fragment, ctx) => {
  let inputUsername = fragment.getElementById("user");
  inputUsername.value = ctx.username;

  let inputPassword = fragment.getElementById("newPass");
  let inputPasswordAgain = fragment.getElementById("newPassAgain");

  let inputExpireAfter = fragment.getElementById("expireAfter");
  inputExpireAfter.value = ctx.expireAfter;

  let inputSaveInterval = fragment.getElementById("saveInterval");
  inputSaveInterval.value = ctx.saveInterval;
  
  let submit = fragment.getElementById("submit");

  let form = submit.parentElement;

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
      // TODO: Save it all
    }

    event.preventDefault();
  };
};

daria.builders["sessions"] = (fragment, ctx) => {
  let cookies = document.createDocumentFragment();

  for (const cookie in ctx.cookies) {
    let row = document.createElement("tr");

    let cookieCell = document.createElement("td");

    let cookieSpan = document.createElement("span");
    cookieSpan.classList.add("cookie");
    cookieSpan.innerText = cookie;
    cookieCell.appendChild(cookieSpan);

    if (ctx.cookies[cookie].self) {
      let selfTag = document.createElement("span");
      selfTag.id = "self";
      selfTag.innerText = "(this session)";
      cookieCell.appendChild(selfTag);
    }

    row.appendChild(cookieCell);

    let sinceCell = document.createElement("td");
    sinceCell.innerText = new Date(ctx.cookies[cookie].since).toLocaleString();
    row.appendChild(sinceCell);

    cookies.appendChild(row);
  }

  cleanElementAndAppend(fragment.getElementById("cookies"), cookies);
};

daria.actions["login:drop-all-sessions"] = () => {
  // TODO
};