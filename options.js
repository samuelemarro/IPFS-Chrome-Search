// Save options to chrome.storage
function save_options() {
    let defaultAction = document.getElementById("defaultAction").value;
    let gateway = document.getElementById("gateway").value;
    chrome.storage.sync.set({
      defaultAction: defaultAction,
      gateway: gateway
    }, function() {
      // Update status to let user know options were saved.
      let status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(function() {
        status.textContent = "";
      }, 750);
    });
  }
  
// Restore select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    defaultAction: "search",
    gateway: "https://gateway.ipfs.io/ipfs/"
  }, function(items) {
    console.log("Setting gateway to " + items.gateway)
    document.getElementById("gateway").value = items.gateway;
  });
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click",
    save_options);