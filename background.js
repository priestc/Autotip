function send_tip(currency, address, amount_usd) {
    if(currency != 'btc') {
        // call shapeshift.io to get a conversion address
    }

    $.get("https://winkdex.com/api/v0/price", function(response) {
        var cents_per_btc = response['price'];
        var tx = new Bitcoin.Transaction();

        chrome.storage.sync.get({
            pub_key: 'none',
            priv_key: 'none',
            tip_amount: 0.05
        }, function(items) {
            var btc_amount = cents_per_btc * items.dollar_tip_amount / 100;
            var satoshi_amount = btc_amount * 100000000;
            tx.addOutput(address, satoshi_amount);
            tx.sign(0, key)
            var key = Bitcoin.ECKey.fromWIF(items.priv_key);
            $.get("https://blockchain.info/pushtx", function() {
                console.log("pushed transaction successfully.");
            });
        });
    });
}

function get_icon_for_currency(currency) {
    var ll = currency.toLowerCase();
    if(ll == 'btc' || ll == 'bitcoin') {
        return 'orange-bitcoin-38.png'
    }
    if(ll == 'ltc' || ll == 'litecoin') {
        return 'litecoin-128.png'
    }
    if(ll == 'doge' || ll == 'dogecoin') {
        return 'dogecoin-128.png'
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // this gets called at "page load time" when a microtip meta tag gets found.

    var tab_id = sender.tab.id;
    chrome.pageAction.show(tab_id);

    chrome.pageAction.setIcon({
        tabId: tab_id,
        path: get_icon_for_currency(request.currency)
    });

    chrome.storage.sync.get({
        when_to_send:'5min',
        tip_amount: '0.05',
    }, function(items) {
        if(items.when_to_send == '5min') {
            chrome.pageAction.setPopup({
                tabId: tab_id,
                popup: 'After 5 mins, would you like to tip this person?'
            });
            setTimeout(function() {
                console.log("chrome.browserAction");
            }, 1000 * 5);
        } else if (items.when_to_send == 'immediately') {
            send_tip(address, currency)
        } else if (items.when_to_send == 'ask') {
            chrome.pageAction.setPopup({
                tabId: tab_id,
                popup: 'would you like to tip this person?'
            });
        }
    })


    if (is_btc(request.currency)) {

        //chrome.pageAction.getPopup(tab_id, function(result) {
        //    console.log(result);
        //});
    }
    // else if (request.clicked_address) {
    //    console.log('address click!!', request.clicked_address);
    // }
});
