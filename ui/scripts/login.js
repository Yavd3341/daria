//
// Login handler
//

document.addEventListener("DOMContentLoaded", _ => {
  let loginForm = document.getElementsByTagName("form")[0];
  let loginInputs = loginForm.getElementsByTagName("input");
  let loginUser = loginInputs[0];
  let loginPass = loginInputs[1];
  let loginBtn = loginForm.getElementsByTagName("button")[0];

  loginForm.onsubmit = event => {
    postAjax("/api/auth", {
      user: loginUser.value,
      pass: loginPass.value,
    }, xhr => {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          loginBtn.classList.remove("error");
          loginBtn.innerText = "Logging in...";
          location.href = "/";
        } else {
          loginBtn.classList.add("error");
          if (xhr.status == 401) {
            const response = JSON.parse(xhr.response);
            switch (response.result) {
              case "err_user":
                loginBtn.innerText = "Invalid username";
                break;
              case "err_pass":
                loginBtn.innerText = "Invalid password";
                break;
              default:
                loginBtn.innerText = "Forbidden";
                break;
            }
          } else
            loginBtn.innerText = "Failed to log in";
        }
      }
    });

    event.preventDefault();
  };
});