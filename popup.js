$("#now").click(function() {
    chrome.runtime.sendMessage({perform_tip: "manual"}, function(response) {
      console.log("sent!");
    });
});
