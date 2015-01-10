chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    var tab_id = sender.tab.id;
    if (request.currency) {
        // Our page node iterating script found a BTC address somewhere on the
        // page. Turn on the "page action" icon.
        chrome.pageAction.show(tab_id);
    }
    // else if (request.clicked_address) {
    //    console.log('address click!!', request.clicked_address);
    // }
  }
);
