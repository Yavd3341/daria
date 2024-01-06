//
// Common functions
//

function ajax(method, url, data, callback, responseType) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.responseType = responseType;
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(data));
  if (callback)
    xhr.onload = () => callback(xhr);
}

function postAjax(url, data, callback) {
  ajax("POST", url, data, callback, "json");
}

function getAjax(url, callback) {
  ajax("GET", url, {}, callback);
}

var daria = {
  actions: {},
  builders: {},

  persistentActions: []
};