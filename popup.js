//chrome.runtime.sendMessage({perform_tip: "manual"});
//document.getElementById('now').onclick = function() {

$("#now").click(function() {
    console.log($, 'popup click!!!!!!!!!!!!!!!!!!!!!!!');
    chrome.runtime.sendMessage({perform_tip: "manual"}, function(response) {
      console.log("sent!");
    });
});
