// Save options to chrome.storage
function save_options() {
  let defaultAction = document.getElementById("defaultAction").value;
  let gateway = document.getElementById("gateway").value;
  let cacheSize = document.getElementById("cacheSize").value;
  chrome.storage.sync.set({
      defaultAction: defaultAction,
      gateway: gateway,
      cacheSize: cacheSize
  }, function () {
      // Update status to let user know options were saved.
      let status = document.getElementById("status");
      status.style.opacity = "100%";
      status.textContent = "Options saved.";
      setTimeout(function () {
          status.style.opacity = "0%";
      }, 750);
  });
}

// Restore the state using the preferences
// stored in chrome.storage
function restore_options() {
  chrome.storage.sync.get({
      defaultAction: "search",
      gateway: "https://gateway.ipfs.io/ipfs/",
      cacheSize: 100
  }, function (items) {
      document.getElementById("defaultAction").value = items.defaultAction;
      document.getElementById("gateway").value = items.gateway;
      document.getElementById("cacheSize").value = items.cacheSize;
  });
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click",
  save_options);
