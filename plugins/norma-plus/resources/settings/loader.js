daria.builders["settings"] = (fragment, ctx) => {
  let form = fragment.getElementById("form");

  let inputAccount = fragment.getElementById("account");
  inputAccount.value = ctx.account;

  let inputUsername = fragment.getElementById("user");
  inputUsername.value = ctx.username;

  let inputPassword = fragment.getElementById("newPass");
  
  let submit = fragment.getElementById("submit");

  form.onsubmit = event => {
    submit.classList.remove("error");

    submit.innerText = "Saving...";

    postAjax("/api/norma-plus/settings", {
      account: inputAccount.value,
      username: inputUsername.value,
      password: inputPassword.value
    }, xhr => {
      if (xhr.readyState == 4) {
        if (xhr.status == 200)
          buildCards(false);
        else {
          submit.classList.add("error");
          submit.innerText = "Failed to apply";
        }
      }
    });

    event.preventDefault();
  };

  let refreshSession = fragment.getElementById("refreshSession");
  refreshSession.onclick = () => 
    postAjax("/api/norma-plus/refresh-session", {});
};