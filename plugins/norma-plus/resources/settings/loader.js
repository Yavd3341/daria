daria.builders["settings"] = (fragment, ctx) => {
  let form = fragment.getElementById("accountEdit");

  let inputAccount = fragment.getElementById("account");
  let inputUsername = fragment.getElementById("user");
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

  // let refreshSession = fragment.getElementById("refreshSession");
  // refreshSession.onclick = () => 
  //   postAjax("/api/norma-plus/refresh-session", {});
};