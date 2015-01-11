function send_tip(address, amount) {
    // this function makes the transaction and sends it to the network.
}

$("meta[name=microtip]").each(function(index, element) {
    var e = $(element);
    var address = e.attr('content');
    var currency = e.data('currency');
    chrome.runtime.sendMessage({currency: currency, address: address});
    console.log("found microtip", currency, address);
});
