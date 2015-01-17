function send_tips(tips, autotip) {
    chrome.storage.sync.get({
        daily_limit_start: 'none',
        usd_tipped_so_far_today: 0,
        daily_tip_limit: 0.5,
        pub_key: 'none',
        priv_key: 'none',
        dollar_tip_amount: 0.05,
        all_tipped_addresses_today: []
    }, function(items) {
        var pub_key = items.pub_key;
        var priv_key = items.priv_key;
        var dollar_tip_amount = items.dollar_tip_amount;
        var usd_tipped_so_far_today = items.usd_tipped_so_far_today;
        var daily_limit_start = items.daily_limit_start;
        var daily_tip_limit = items.daily_tip_limit;
        var all_tipped_addresses_today = items.all_tipped_addresses_today;

        var now_timestamp = new Date().getTime() / 1000;
        var day_ago_timestamp = now_timestamp - (60 * 60 * 24);

        /////////////////////////////////////////////////////
        ///// determine if we make the tip, or cancel the tip
        /////////////////////////////////////////////////////

        var cancel_tip = false;
        var cancel_reason = '';

        if(daily_limit_start == 'none' || daily_limit_start < day_ago_timestamp) {
            // it was over a day ago since we've been keeping track, reset the interval
            console.log("Resetting interval now. Old interval started:", new Date(daily_limit_start * 1000))
            chrome.storage.sync.set({
                usd_tipped_so_far_today: 0,
                daily_limit_start: now_timestamp,
                all_tipped_addresses_today: []
            });
        } else {
            var new_accumulation = Number(dollar_tip_amount) + Number(usd_tipped_so_far_today);
            if(new_accumulation <= daily_tip_limit) {
                // not over the limit
            } else if (autotip) {
                // over the limit, do not tip
                cancel_tip = true;
                cancel_reason = "Over daily limit: " + usd_tipped_so_far_today;
            } else {
                // we are over the limit, but its a manual tip, so we let it through
            }
        }

        if(cancel_tip) {
            console.log("Cancelled tip: ", cancel_reason);
            return
        }

        console.log("Interval start:", new Date(daily_limit_start * 1000));
        console.log("All addresses today:", all_tipped_addresses_today)

        /////////////////////////////////////////////////////
        // the tip is happening, create the transaction below
        /////////////////////////////////////////////////////

        $.get("https://winkdex.com/api/v0/price", function(response) {
            var cents_per_btc = response['price'];
            var btc_amount = dollar_tip_amount / cents_per_btc * 100;
            var satoshi_amount = btc_amount * 100000000;

            console.log('called winkdex: ', cents_per_btc / 100);

            $.get("http://btc.blockr.io/api/v1/address/unspent/" + pub_key, function(response) {
                console.log('called blockrio: found ', response['data']['unspent'].length, " inputs");

                var utxos_from_blockrio = response['data']['unspent'];
                var utxos = [];
                var total_amount = 0;
                $.each(utxos_from_blockrio, function(index, utxo) {
                    // loop through each unspent output until we get enough to cover the cost of this tip.
                    if(total_amount < satoshi_amount) {
                        utxos.push(
                            new Transaction.UnspentOutput({
                                "txid": utxo['tx'],
                                "vout": utxo['n'],
                                "address": pub_key,
                                "scriptPubKey": utxo['script'],
                                "amount":  utxo['amount']
                            })
                        );
                        total_amount += utxo['amount'];
                    } else {
                        return false;
                    }
                });

                if(total_amount < btc_amount) {
                    console.log("Canceling tip because not enough unspent outputs. Deposit more bitcoin.");
                    console.log("Needed: ", btc_amount ,"you only have: ", total_amount);
                    return
                }

                var tx = new Transaction().from(utxos).change(pub_key);
                $.each(tips, function(index, tip) {
                    if(all_tipped_addresses_today.indexOf(tip.address) >= 0) {
                        console.log("Already tipped this address today " + all_tipped_addresses_today);
                        return
                    }
                    var this_tip_amount = Math.floor(satoshi_amount / tips.length);

                    if(tip.currency == 'btc') {
                        tx = tx.to(Address.fromString(tip.address), this_tip_amount);
                        console.log('Added', tip.address, "to transaction at", this_tip_amount);
                    } else if(clean_currency(tip.currency)){
                        // call shapeshift.io to convert the bitcoin tip to altcoin
                        //$.ajax({
                        //    url: "http://shapeshift.io/shift",
                        //    type: "post",
                        //    async: false,
                        //    data: {
                        //        withdrawal: tip.address,
                        //        pair: "btc_" + clean_currency(currency),
                        //        amount: btc_amount,
                        //        returnAddress: return_address
                        //    },
                        //    success: function(response) {
                        //        var ssio_address = Address.fromString(response.deposit);
                        //        tx = tx.to(ssio_address, this_tip_amount);
                        //    }
                        //});
                    } else {
                        console.log("Unknown currency (not supported by shapeshift.io)", tip.currency);
                    }
                });

                $.post("http://btc.blockr.io/api/v1/tx/push", {hex: tx.sign(priv_key).serialize()}, function(response) {
                    console.log("Pushed transaction successfully. Tipped so far today:", new_accumulation);

                    $.each(tips, function(index, tip) {
                        // mark each address as having been sent to for today
                        all_tipped_addresses_today.push(tip.address);
                    });
                    chrome.storage.sync.set({
                        usd_tipped_so_far_today: new_accumulation,
                        all_tipped_addresses_today: all_tipped_addresses_today
                    });
                });
            });
        });
    });
}

function clean_currency(currency) {
    // make sure the curency code is a correct code, allowing for
    // upper case, lower case and the full currency name.
    var ll = currency.toLowerCase();
    if(ll == 'btc' || ll == 'bitcoin') {
        return 'btc';
    }
    if(ll == 'ltc' || ll == 'litecoin') {
        return 'ltc';
    }
    if(ll == 'doge' || ll == 'dogecoin') {
        return 'doge';
    }
    if(ll == 'rdd' || ll == 'reddcoin') {
        return 'rdd';
    }
    if(ll == 'ppc' || ll == 'peercoin') {
        return 'ppc';
    }
    if(ll == 'bc' || ll == 'blackcoin') {
        return 'rdd';
    }
    if(ll == 'drk' || ll == 'darkcoin') {
        return 'drk';
    }
    if(ll == 'qrk' || ll == 'quark') {
        return 'qrk';
    }
    if(ll == 'nxt') {
        return 'nxt';
    }
    return null;
}

function get_icon_for_currency(currency) {
    var cleaned = clean_currency(currency);
    if(cleaned == 'btc') {
        return chrome.extension.getURL('orange-bitcoin-38.png');
    }
    if(cleaned == 'ltc') {
        return chrome.extension.getURL('litecoin-128.png');
    }
    if(cleaned == 'doge') {
        return chrome.extension.getURL('dogecoin-128.png');
    }
}

var tip_addresses = [];

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // dispatches all messages

    if(request.perform_tip) {
        // user clicked the "tip now" button
        send_tips(request.tips, false);
        return
    }

    if(request.get_tips) {
        // the popup's js needs the tips for that page.
        sendResponse({tips: tip_addresses[request.tab]});
        return
    }

    if(request.found_tips) {
        // report list of tips found on the page.

        var tab_id = sender.tab.id;
        chrome.pageAction.show(tab_id);

        $.each(request.found_tips, function(index, tip) {
            // set the tip icon based on the last tip's currency
            chrome.pageAction.setIcon({
                tabId: tab_id,
                path: get_icon_for_currency(tip.currency)
            });
        });

        chrome.storage.sync.get({
            when_to_send: 'ask',
        }, function(items) {
            if(items.when_to_send == '5min') {
                // TODO: wait for 5 minutes, then prompt the user.
            } else if (items.when_to_send == 'immediately') {
                send_tips(request.found_tips, true);
            } else if (items.when_to_send == 'ask') {
                // popup will open when icon is clicked
                // that popup will send the tip
                // save for when the popup needs them.
                tip_addresses[tab_id] = request.found_tips;
            }
        });
    }
});
