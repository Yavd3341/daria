//
// Common functions
//

function ajax(method, url, data, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(data));
  if (callback)
    xhr.onload = () => callback(xhr);
}

function postAjax(url, data, callback) {
  ajax("POST", url, data, callback);
}

function getAjax(url, data, callback) {
  ajax("GET", url, data, callback);
}