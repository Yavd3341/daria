//
// Session handler
//

getAjax("/api/auth/", {}, xhr => {
  if (xhr.readyState == 4 && xhr.status != 200)
    location.href = "/login.html";
});

document.addEventListener("DOMContentLoaded", _ =>
  logout.onclick = _ => 
    postAjax("/api/auth/logout", {}, _ => 
      location.href = "/login.html"));

