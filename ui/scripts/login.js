//
// Login handler
//

getAjax("/api/auth/", xhr => {
  if (xhr.readyState == 4 && xhr.status == 200)
    location.href = "/";
});

document.addEventListener("DOMContentLoaded", _ => {
  let loginForm = document.getElementsByTagName("form")[0];
  let loginInputs = loginForm.getElementsByTagName("input");
  let loginUser = loginInputs[0];
  let loginPass = loginInputs[1];
  let loginBtn = loginForm.getElementsByTagName("button")[0];

  loginForm.onsubmit = event => {
    loginUser.classList.remove("error");
    loginPass.classList.remove("error");
    loginBtn.classList.remove("error");

    loginBtn.innerText = "Logging in...";

    postAjax("/api/auth", {
      user: loginUser.value,
      pass: loginPass.value,
    }, xhr => {
      if (xhr.readyState == 4) {
        if (xhr.status == 200)
          location.href = "/";
        else {
          loginBtn.classList.add("error");
          if (xhr.status == 401) {
            const response = xhr.response;
            switch (response.result) {
              case "err_user":
                loginBtn.innerText = "Invalid username";
                loginUser.classList.add("error");
                break;
              case "err_pass":
                loginBtn.innerText = "Invalid password";
                loginPass.classList.add("error");
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