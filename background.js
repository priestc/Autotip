chrome.storage.sync.get({
    pub_key: null,
    priv_key: null,
    when_to_send: null,
    dollar_tip_amount: null,
    daily_tip_limit: null,
    one_per_address: null,
    beep_on_tip: null,
    blacklist_or_whitelist: null,
    domain_list: null,
    interval_seconds: null,
    miner_fee: null,
    giveaway_participation: null,
    show_notifications: null
}, function(items) {
    // the below function gets called whenever:
    //   1. a new version is installed,
    //   2. The extension is restarted
    //
    // This function handles setting the default values for all settings.

    if(!items.pub_key || !items.priv_key) {
        // if keys have not been generated, do so now and save them.
        // this code only gets called when the extension first gets installed.
        var key = new PrivateKey();
        items.pub_key = key.toAddress().toString();
        items.priv_key = key.toWIF();
        chrome.storage.sync.set({
            pub_key: items.pub_key,
            priv_key: items.priv_key,
        });
    }
    if(!items.when_to_send) {
        chrome.storage.sync.set({
            when_to_send: 'immediately'  //'ask', 'immediately', '5mins'
        });
    }
    if(!items.dollar_tip_amount) {
        chrome.storage.sync.set({
            dollar_tip_amount: 0.05
        });
    }
    if(!items.daily_tip_limit) {
        chrome.storage.sync.set({
            daily_tip_limit: 0.5
        });
    }
    if(!items.one_per_address) {
        chrome.storage.sync.set({
            one_per_address: true
        });
    }
    if(!items.beep_on_tip) {
        chrome.storage.sync.set({
            beep_on_tip: false
        });
    }
    if(!items.blacklist_or_whitelist) {
        chrome.storage.sync.set({
            blacklist_or_whitelist: 'blacklist' // 'none', 'whitelist' or 'blacklist'
        });
    }
    if(!items.domain_list) {
        chrome.storage.sync.set({
            domain_list: ['somethingawful.com']
        });
    }
    if(!items.interval_seconds) {
        chrome.storage.sync.set({
            interval_seconds: 300
        });
    }
    if(!items.miner_fee) {
        chrome.storage.sync.set({
            miner_fee: 0.01
        });
    }
    if(!items.giveaway_participation) {
        chrome.storage.sync.set({
            giveaway_participation: true
        });
    }
    if(!items.show_notifications) {
        chrome.storage.sync.set({
            show_notifications: true
        });
    }
});

var cents_per_btc_bitstamp;
function get_price_from_bitstamp() {
    $.ajax({
        url: "https://www.bitstamp.net/api/ticker/",
        type: 'get',
        async: false,
        success: function(response) {
            if (response['last'] > 0) {
                cents_per_btc_bitstamp = parseFloat(response['last'] * 100);
            } else {
                console.error("bitstamp returned 0 (??)");
                cents_per_btc_bitstamp = null;
            }
        }
    });

    return cents_per_btc_bitstamp
}


var cents_per_btc, btc_price_fetch_date;
function get_price_from_winkdex() {
    // Makes a call to the winkdex to get the current price for bitcoin
    // only one call is made every three hours. the value is cached.

    var age_hours;
    if(cents_per_btc) {
        var age_hours = (new Date() - btc_price_fetch_date) / 3600000; // 3 hours in miliseconds
    }

    if(!age_hours || age_hours > 3) {
        $.ajax({
            url: "https://winkdex.com/api/v0/price",
            type: 'get',
            async: false,
            success: function(response) {
                if (response['price'] > 0) {
                    cents_per_btc = response['price'];
                } else {
                    console.error("price returned 0 (??)")
                    console.log("trying to get price from bitstamp")
                    cents_per_btc = get_price_from_bitstamp();
                }
            },
            error: function(xhr, status, error) {
                console.error("Call to get btc price failed", status, error)
                cents_per_btc = null;
                btc_price_fetch_date = null;
            }
        });
        if(cents_per_btc > 0) {
            btc_price_fetch_date = new Date();
            console.log("Made call to get BTC price:", cents_per_btc / 100, "USD/BTC");
        }
    } else {
        console.log("Using old value for bitcoin price:", cents_per_btc / 100, "USD/BTC from", btc_price_fetch_date);
    }
    return cents_per_btc;
}

function cancel_tip(msg) {
    console.log("Tip Canceled!: " + msg);
    chrome.runtime.sendMessage({popup_status: msg, fail: true});
}

/////////////////////////////////////////
//
//  Alarm for resetting all daily limits
//
/////////////////////////////////////////

function make_next_alarm() {
    var end_of_day = new Date();
    end_of_day.setHours(23,59,59,999);
    console.log("Made alarm for", end_of_day);
    chrome.alarms.create("EndOfDay", {when: end_of_day.getTime()});
}

chrome.runtime.onInstalled.addListener(make_next_alarm);

chrome.alarms.onAlarm.addListener(function(alarm) {
    // All variables that relate to daily limits or list of domains
    // tipped today get resetted. This code need to be called
    // periotically on a daily basis.

    if(alarm.name == "EndOfDay") {
        console.log("Running End of Day alarm, resetting all daily values");

        chrome.storage.sync.set({
            usd_tipped_so_far_today: 0,
            all_tipped_addresses_today: [],
            all_tipped_domains_today: []
        }, function() {
            // hopefully by now 0.001 seconds have passed
            // so this alarm gets made for the end of the next day.
            make_next_alarm();
        });
    }
});

// end alarm code

function send_tips(tips, autotip, tab_id) {
    // Make the bitcoin transaction and push it to the network.
    // * The first argument is a list of addresses and the corresponding ratio
    // * The second argument is a boolean determining if this tip is being sent
    // via manual or automatically.
    // * The third argument is the tab id that the tip is going to.

    chrome.storage.sync.get({
        usd_tipped_so_far_today: null,
        daily_tip_limit: null,
        pub_key: null,
        priv_key: null,
        dollar_tip_amount: null,
        all_tipped_addresses_today: [],
        beep_on_tip: null,
        one_per_address: null,
        miner_fee: null,
        giveaway_participation: null,
        show_notifications: null,
    }, function(items) {
        var pub_key = items.pub_key;
        var priv_key = items.priv_key;
        var dollar_tip_amount = items.dollar_tip_amount;
        var usd_tipped_so_far_today = items.usd_tipped_so_far_today;
        var daily_tip_limit = items.daily_tip_limit;
        var all_tipped_addresses_today = items.all_tipped_addresses_today;
        var one_per_address = items.one_per_address;
        var miner_fee_cents = items.miner_fee;
        var giveaway_participation = items.giveaway_participation;
        var show_notifications = items.show_notifications;

        /////////////////////////////////////////////////////
        ///// determine if we make the tip, or cancel the tip
        /////////////////////////////////////////////////////

        var new_accumulation = Number(dollar_tip_amount) + Number(usd_tipped_so_far_today);

        if(new_accumulation > daily_tip_limit && autotip) {
            cancel_tip("Canceling tip! Over daily limit for autotip:", usd_tipped_so_far_today);
            return
        }

        var cents_per_btc = get_price_from_winkdex();
        console.log("winkdex returned", cents_per_btc, "cents/BTC")
        if(!cents_per_btc) {
            // when call to winkdex fails, null is returned.
            cancel_tip("Network Error: Could not get price from winkdex");
            return
        }

        /////////////////////////////////////////////////////
        // the tip is happening, create the transaction below
        /////////////////////////////////////////////////////

        var page_btc_amount = dollar_tip_amount / cents_per_btc * 100;
        var page_satoshi_amount = page_btc_amount * 1e8;

        var satoshi_fee = Math.floor(miner_fee_cents / cents_per_btc * 1e10);
        var tx_total_btc = ((page_satoshi_amount + satoshi_fee) / 1e8);

        console.log("This page will get: " + Math.floor(page_satoshi_amount) + " satoshis (" + tx_total_btc.toFixed(8) + " BTC including fee)");

        var all_utxos = unspent_outputs_insight(pub_key);

        // look through all deposits and see if one of them is from the giveaway payout system.
        find_giveaway_submissions(all_utxos, cents_per_btc);

        var utxos = [];
        var total_inputs_btc = 0;
        $.each(all_utxos, function(index, utxo) {
            // loop through each unspent output until we get enough to cover the cost of this tip.
            utxos.push(new Transaction.UnspentOutput(utxo));
            total_inputs_btc += utxo['amount'];
        });

        var change_amount = total_inputs_btc - tx_total_btc;
        var change_amount_decimal = change_amount % 1;
        var last_three = change_amount_decimal.toFixed(8).substr(7);

        if(last_three = '887') {
            // so we dont think this output is a giveaway payout.
            console.log("adding a single satoshi to fee");
            satoshi_fee += 1;
        }

        if(total_inputs_btc < tx_total_btc) {
            cancel_tip("Needed: " + tx_total_btc.toFixed(8) + " you only have: " + total_inputs_btc.toFixed(8));
            if(show_notifications) {
                var msg = "Autotip can't send tip because your balance is too low. Please deposit more bitcoins."
                chrome.notifications.create("", {
                    type: "basic",
                    iconUrl: 'logos/autotip-logo-128-red.png',
                    title: "Out of Bitcoin",
                    message: msg,
                }, function() {
                    //console.log("notification made");
                });
            }
            return
        }

        normalize_ratios(tips);

        var total_tip_amount_satoshi = 0;
        //var num_of_shapeshifts = 0; // counter to keep track of a bug in shapeshift.io's code
        var added_to_tx = [];
        var tx = new Transaction().from(utxos).change(pub_key);
        $.each(tips, function(index, tip) {
            if(autotip && one_per_address && all_tipped_addresses_today.indexOf(tip.address) >= 0) {
                console.log("Already tipped this address today:", all_tipped_addresses_today);
                return
            }

            var this_tip_amount = Math.floor(page_satoshi_amount * tip.ratio);

            var currency = clean_currency(tip.currency);
            if(currency == 'btc') {
                tx = tx.to(Address.fromString(tip.address), this_tip_amount);
                added_to_tx.push(tip.address);
                console.log('Added', tip.address, "to transaction at", this_tip_amount);
            } else if(false) { //currency) {
                // call shapeshift.io to convert the bitcoin tip to altcoin.
                // commented out for the time being, until shapeshift removes their
                // minimum amount, or another easy exchange API comes along that
                // doesn't have a minumum amount.

                if(num_of_shapeshifts >= 1) {
                    console.log("Canceling recipient because Shapeshift.io's code has a bug that doesn't allow for multiple deposits for a single transactions")
                    return
                }
                var ssio_address = get_shift_address(pub_key, tip.address, currency);
                tx = tx.to(Address.fromString(ssio_address), this_tip_amount);
                added_to_tx.push(tip.address);
                console.log('Added', ssio_address, "to transaction at", this_tip_amount, "(shapeshift)");
                num_of_shapeshifts += 1;
            } else {
                console.log("Unknown currency (not supported by shapeshift.io)", tip.currency);
                return
            }

            total_tip_amount_satoshi += this_tip_amount;
        });

        if(added_to_tx.length == 0) {
            console.log("Skipping as there are no recipients");
            return
        }

        var tx_hex = tx.fee(satoshi_fee).sign(priv_key).serialize();

        console.log("Using fee of", satoshi_fee, "Satoshis");
        console.log("Pushing tx:", tx_hex);

        $.ajax({
            url: "https://btc.blockr.io/api/v1/tx/push",
            type: 'post',
            data: {hex: tx_hex},
            success: function(response) {
                var total_tip_amount_dollar = total_tip_amount_satoshi * cents_per_btc / 1e10;
                var new_dollar_tip_amount_today = total_tip_amount_dollar + usd_tipped_so_far_today;

                console.log("Pushed transaction successfully. Tipped so far today: $", new_dollar_tip_amount_today.toFixed(2));

                $.each(added_to_tx, function(index, address) {
                    // mark each address as having been sent to for today
                    all_tipped_addresses_today.push(address);
                });
                chrome.storage.sync.set({
                    usd_tipped_so_far_today: new_dollar_tip_amount_today,
                    all_tipped_addresses_today: all_tipped_addresses_today
                });

                if(items.beep_on_tip) {
                    var audio = new Audio(chrome.extension.getURL("beep.wav"));
                    audio.play();
                }

                chrome.runtime.sendMessage({popup_status: "Tip Sent!"});

                if(show_notifications) {
                    var msg = "$" + total_tip_amount_dollar.toFixed(2) + " was sent to " + tips.length + " recipients. ";
                    msg += new_dollar_tip_amount_today.toFixed(2) + " tipped so far today.";
                    chrome.notifications.create("", {
                        type: "basic",
                        iconUrl: 'logos/autotip-logo-128-black.png',
                        title: "Tip Sent!",
                        message: msg,
                    }, function() {
                        //console.log("notification made");
                    });
                    set_icon(tab_id, "tipped");
                }

                if(giveaway_participation) {
                    send_giveaway_submission(pub_key);
                }
            },
            error: function() {
                cancel_tip("Pushtx failed");
                set_icon(tab_id, "failed");
            }
        });
    });
}

function set_icon(tab_id, status) {
    var url = 'logos/autotip-logo-38-black.png'; // black

    if(status == 'pending') {
        url = 'logos/autotip-logo-38-yellow.png'
    } else if (status == 'tipped') {
        url = 'logos/autotip-logo-38-green.png'
    } else if (status == 'failed') {
        url = 'logos/autotip-logo-38-red.png'
    }

    chrome.pageAction.show(tab_id);
    chrome.pageAction.setIcon({
        tabId: tab_id,
        path: chrome.extension.getURL(url)
    });
}

//chrome.webRequest.onBeforeRequest.addListener(
//    // this bit of code handles adding the 'autotip: true' request header to all
//    // outgoing requests. This is so servers know you have tipping capabilities.
//    function(details) {
//        details.requestHeaders.push({key: "Autotip", value: "true"})
//        return {requestHeaders: details.requestHeaders};
//    },
//    {urls: ["<all_urls>"]},
//);

var whitelist_blacklist_status = {};
var tip_addresses = {};
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // dispatches all messages

    if(request.get_btc_price) {
        sendResponse({price: get_price_from_winkdex()});
        return
    }

    if(request.audio_song_end) {
        // A song just ended, the content script has picked up the tips from the
        // <audio> element, and has sent the message back. This code handles that
        // message.

        var tab_id = sender.tab.id;
        var new_tips = [];
        var added_to_existing = [];

        $.each(tip_addresses[tab_id], function(i, existing_tip) {
            // add new song to tip list
            $.each(request.audio_song_end, function(i, new_tip) {
                if(existing_tip.address == new_tip.address) {
                    // add to the existing tip by adding on the ratio.

                    new_tips.push({
                        ratio: new_tip.ratio + existing_tip.ratio,
                        address: new_tip.address,
                        recipient: new_tip.recipient
                    })
                    added_to_existing.push(new_tip.address)
                }
            });
        });

        $.each(request.audio_song_end, function(i, tip) {
            if(added_to_existing.indexOf(tip.address) == -1) {
                // this address was not added to an existing total
                new_tips.push(tip)
            }
        });

        tip_addresses[tab_id] = new_tips;
        return
    }

    if(request.get_tips) {
        // the popup's js needs the tips for displaying on that page.
        // also send back a black/white list button if applicable.

        var tab_id = request.tab;
        var data = whitelist_blacklist_status[tab_id];

        var blocked, list, domain;
        if(data) {
            blocked = data[0];
            list = data[1];
            domain = data[2];
        }

        chrome.storage.sync.get({
            blacklist_or_whitelist: null,
        }, function(items) {
            var button = '';
            if(items.blacklist_or_whitelist == 'none') {
                //console.log("no blacklist or whitelist");
            }
            else if (blocked == 'blocked' && list == 'blacklist') {
                console.log("blocked by blacklist");
                var txt = 'Remove ' + domain + ' from blacklist';
                button = '<input type="button" data-domain="' + domain + '" class="button blacklist remove" value="' + txt + '">';
            }
            else if(blocked == 'blocked' && list == 'whitelist') {
                console.log("blocked by whitelist");
                var txt = 'Add ' + domain + ' to whitelist';
                button = '<input type="button" data-domain="' + domain + '" class="button whitelist add" value="' + txt + '">';
            }
            else if(blocked == 'allowed' && list == 'whitelist') {
                console.log("allowed by whitelist");
                var txt = 'Remove ' + domain + ' from whitelist';
                button = '<input type="button" data-domain="' + domain + '" class="button whitelist remove" value="' + txt + '">';
            }
            else if(blocked == 'allowed' && list == 'blacklist') {
                console.log("allowed by blacklist");
                var txt = 'Add ' + domain + ' to blacklist';
                button = '<input type="button" data-domain="' + domain + '" class="button blacklist add" value="' + txt + '">';
            }
            sendResponse({
                tips: tip_addresses[tab_id],
                button: button,
            });
        });
        return true; // indicate asynchronious response
    }

    if(request.found_tips) {
        // report list of tips found on the page.

        var tab_id = sender.tab.id;
        var one_address_not_tipped = false;

        chrome.storage.sync.get({
            all_tipped_addresses_today: null,
        }, function(items) {
            // Determine if all addresses on the page have been tipped today
            var all = items.all_tipped_addresses_today;
            $.each(request.found_tips, function(index, address) {
                if(all.indexOf(address.address) < 0) {
                    // we have not tipped this address yet
                    set_icon(tab_id, 'pending');
                    one_address_not_tipped = true
                    return false // break out of $.each
                }
            });
            if(!one_address_not_tipped) {
                // already tipped all addresses, use green icon
                set_icon(tab_id, 'tipped');
            }
            tip_addresses[tab_id] = request.found_tips;
            sendResponse({
                already_tipped: !one_address_not_tipped
            });
        });
        return true; // indicate asynchronious response
    }

    if(request.perform_tip == 'manual') {
        // user clicked the "tip now" button
        send_tips(request.tips, false, request.tab_id || sender.tab.id);
        return
    }

    if(request.perform_tip == 'auto') {
        // autotip is enabled and we found some tips.
        send_tips(request.tips, true, sender.tab.id);
        return
    }
    if(request.mode && request.domain) {
        // this page's autotip was canceled because it was not in whitelist
        // or it was in the blacklist. Record this fact so we can put the
        // 'remove from blacklist', or 'add to whitelist' button.

        var val;
        var tab_id = sender.tab.id;
        if(request.mode == 'blocked_by_whitelist') {
            val = ['blocked', 'whitelist', request.domain];
        }
        if(request.mode == 'blocked_by_blacklist') {
            val = ['blocked', 'blacklist', request.domain];
        }
        if(request.mode == 'allowed_by_whitelist') {
            val = ['allowed', 'whitelist', request.domain];
        }
        if(request.mode == 'allowed_by_blacklist') {
            val = ['allowed', 'blacklist', request.domain];
        }
        whitelist_blacklist_status[tab_id] = val;
        return
    }

    if(request.add_or_remove && request.domain) {
        // gets caled when the user clicks the black or white "remove from blacklist"
        // button

        var add_or_remove = request.add_or_remove;
        var clicked_domain = request.domain;

        chrome.storage.sync.get({
            domain_list: null,
        }, function(items) {
            var domain_list = items.domain_list;

            console.log('domain list is', domain_list);

            if(add_or_remove == 'remove'){
                var index = domain_list.indexOf(clicked_domain);
                domain_list.splice(index, 1);
                console.log("removed from domain list");

            } else if(add_or_remove == 'add') {
                domain_list.push(clicked_domain);
                console.log("added to domain list");
            }

            console.log("setting new domain list", domain_list);
            chrome.storage.sync.set({
                domain_list: domain_list
            });
        });
    }
});
