$("#now").click(function() {
    chrome.runtime.sendMessage({perform_tip: "manual"}, function(response) {
      console.log("sent!");
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("POPUP.JS", request);
    if(request.address) {
        $("#tip_address").text(request.address);
    }
});
