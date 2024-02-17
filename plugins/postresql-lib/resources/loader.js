daria.builders["settings"] = (fragment, ctx) => {
  let form = fragment.getElementById("form");

  let inputHost = fragment.getElementById("host");
  inputHost.value = ctx.host;

  let inputPort = fragment.getElementById("port");
  inputPort.value = ctx.port;
  
  let submit = fragment.getElementById("submit");

  form.onsubmit = event => {
    inputPort.classList.remove("error");

    submit.classList.remove("error");
    submit.innerText = "Saving...";

    if (inputPort.value == 0) {
      inputPort.classList.add("error");
      submit.classList.add("error");
      submit.innerText = "Port cannot be zero";
    }
    else {
      postAjax("/api/postgres", {
        host: inputHost.value,
        port: inputPort.value,
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
    }

    event.preventDefault();
  };
};