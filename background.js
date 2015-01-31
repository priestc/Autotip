function send_tips(tips, autotip) {
    chrome.storage.sync.get({
        daily_limit_start: 'none',
        usd_tipped_so_far_today: 0,
        daily_tip_limit: 0.5,
        pub_key: 'none',
        priv_key: 'none',
        dollar_tip_amount: 0.05,
        all_tipped_addresses_today: [],
        beep_on_tip: true
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
            daily_limit_start = now_timestamp;
            usd_tipped_so_far_today = 0;
            all_tipped_addresses_today = [];
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

            console.log('called winkdex: ', cents_per_btc / 100, 'USD/BTC');
            console.log("this page will get:", satoshi_amount, "satoshis (", btc_amount, "BTC)");

            var all_utxos = unspent_outputs_insight(pub_key);
            var utxos = [];
            var total_amount = 0;
            $.each(all_utxos, function(index, utxo) {
                // loop through each unspent output until we get enough to cover the cost of this tip.
                if(total_amount < satoshi_amount) {
                    utxos.push(new Transaction.UnspentOutput(utxo));
                    total_amount += utxo['amount'];
                } else {
                    return false;
                }
            });

            if(total_amount < btc_amount) {
                console.log("Canceling tip because not enough unspent outputs. Deposit more bitcoin.");
                console.log("Needed: ", btc_amount, "you only have:", total_amount);
                return
            }

            var total_ratio = 0, ratio_verified = false;
            $.each(tips, function(index, tip) {
                // verify that all tip ratios add up to less than 1.0
                if(tip.ratio > 0 && tip.ratio <= 1.0) {
                    total_ratio += tip.ratio;
                } else {
                    tip.ratio = 1 / tips.length;
                }
            });
            if(total_ratio <= 1.0) {
                ratio_verified = true;
                console.log("using ratios found on page (verified)");
            }

            var added_to_tx = [];
            var tx = new Transaction().from(utxos).change(pub_key);
            $.each(tips, function(index, tip) {
                if(autotip && all_tipped_addresses_today.indexOf(tip.address) >= 0) {
                    console.log("Already tipped this address today " + all_tipped_addresses_today);
                    return
                }

                var this_tip_amount = Math.floor(satoshi_amount / tips.length);
                if(ratio_verified && tip.ratio) {
                    this_tip_amount = Math.floor(satoshi_amount * tip.ratio);
                }

                var currency = clean_currency(tip.currency);
                if(currency == 'btc') {
                    tx = tx.to(Address.fromString(tip.address), this_tip_amount);
                    added_to_tx.push(tip.address);
                    console.log('Added', tip.address, "to transaction at", this_tip_amount);
                } else if(currency){
                    // call shapeshift.io to convert the bitcoin tip to altcoin
                    var ssio_address = get_shift_address(pub_key, tip.address, currency);
                    tx = tx.to(Address.fromString(ssio_address), this_tip_amount);
                    added_to_tx.push(tip.address);
                    console.log('Added', ssio_address, "to transaction at", this_tip_amount, "(shapeshift)");
                } else {
                    console.log("Unknown currency (not supported by shapeshift.io)", tip.currency);
                }
            });

            if(added_to_tx.length == 0) {
                console.log("Skipping as there are no recipients");
                return
            }

            var satoshi_fee = Math.floor(0.01 / cents_per_btc * 100 * 100000000); // one cent fee
            var tx_hex = tx.fee(satoshi_fee).sign(priv_key).serialize();

            console.log("Using fee of", satoshi_fee, "Satoshis");
            console.log("Pushing tx:", tx_hex);

            $.post("https://btc.blockr.io/api/v1/tx/push", {hex: tx_hex}, function(response) {
                console.log("Pushed transaction successfully. Tipped so far today:", new_accumulation.toFixed(2));

                $.each(added_to_tx, function(index, address) {
                    // mark each address as having been sent to for today
                    all_tipped_addresses_today.push(address);
                });
                chrome.storage.sync.set({
                    usd_tipped_so_far_today: new_accumulation,
                    all_tipped_addresses_today: all_tipped_addresses_today
                });

                if(items.beep_on_tip) {
                    var audio = new Audio(chrome.extension.getURL("beep.wav"));
                    audio.play();
                }
            });
        });
    });
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


        chrome.pageAction.setIcon({
            tabId: tab_id,
            path: chrome.extension.getURL('autotip-logo-38.png')
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
