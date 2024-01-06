//
// Session handler
//

function logout() {
  postAjax("/api/auth/logout", {}, _ => 
    location.href = "/login.html");
}

getAjax("/api/auth/", xhr => {
  if (xhr.readyState == 4 && xhr.status != 200)
    location.href = "/login.html";
});

daria.actions["daria:logout"] = logout;
daria.persistentActions.push("daria:logout");

document.addEventListener("DOMContentLoaded", _ =>
  document.getElementById("logout").onclick = _ => logout()
);