function clean_currency(currency) {
    // make sure the curency code is a correct code, allowing for
    // upper case, lower case and the full currency name.

    if(!currency) {
        return "btc";
    }

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
        return 'bc';
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
        return chrome.extension.getURL('logos/orange-bitcoin-38.png');
    }
    if(cleaned == 'ltc') {
        return chrome.extension.getURL('logos/litecoin-128.png');
    }
    if(cleaned == 'doge') {
        return chrome.extension.getURL('logos/dogecoin-128.png');
    }
    if(cleaned == 'ppc') {
        return chrome.extension.getURL('logos/gold-peercoin-250.png');
    }
}
function unspent_outputs_insight(pub_key) {
    // get unspent outputs from bitpay insight
    var outputs = [];
    $.ajax({
        url: "https://insight.bitpay.com/api/addr/" + pub_key + "/utxo?noCache=1",
        type: "get",
        async: false,
        success: function(response) {
            $.each(response, function(index, output) {
                outputs.push({
                    "txid": output['txid'],
                    "vout": output['vout'],
                    "address": pub_key,
                    "scriptPubKey": output['scriptPubKey'],
                    "amount":  output['amount']
                });
            });
        }
    });
    return outputs;
}

function unspent_outputs_multiexplorer(pub_key) {
    // get unspent outputs from multiexplorer API.
    var outputs = [];
    $.ajax({
        url: "https://multiexplorer.com/api/unspent_outputs/fallback?currency=btc&address=" + pub_key,
        type: "get",
        async: false,
        success: function(response) {
            console.log("utxo response:", response);
            $.each(response.utxos, function(index, output) {
                var vout = parseInt(output['output'].split(":")[1]);
                var txid = output['output'].split(":")[0];
                outputs.push({
                    "txid": txid,
                    "vout": vout,
                    "script": output['scriptPubKey'],
                    "address": pub_key,
                    "amount":  output['amount'] / 1e8
                });
            });
        }
    });
    return outputs;
}

function unspent_outputs_blockr(pub_key) {
    // get unspent outputs from blockr.io
    var outputs = [];
    $.ajax({
        url: "http://btc.blockr.io/api/v1/address/unspent/" + pub_key,
        type: "get",
        async: false,
        success: function(response) {
            console.log('called blockrio: found', response['data']['unspent'].length, "inputs");
            var utxos_from_blockrio = response['data']['unspent'];
            $.each(utxos_from_blockrio, function(index, utxo) {
                outputs.push({
                    "txid": utxo['tx'],
                    "vout": utxo['n'],
                    "address": pub_key,
                    "scriptPubKey": utxo['script'],
                    "amount":  utxo['amount']
                });
            });
        }
    });
    return outputs;
}

function get_shift_address(deposit_address, tip_address, currency) {
    // Call shapeshift.io to get a 'shift address' that will convert bitcoin
    // to an altcoin address (passed in as currency).
    var ssio_address;
    $.ajax({
        url: "https://shapeshift.io/shift",
        type: "post",
        async: false,
        data: {
            withdrawal: tip_address,
            pair: "btc_" + currency,
            returnAddress: deposit_address
        },
        success: function(response) {
            ssio_address = response.deposit;
        }
    });
    return ssio_address;
}

function normalize_ratios(tips) {
    // Make sure the ratios included with each tip checks out.
    // If they do not check out, ratios are reset to 1/length for each.
    var total_ratio = 0;
    $.each(tips, function(index, tip) {
        // verify that all tip ratios add up to less than 1.0
        if(tip.ratio > 0 && tip.ratio <= 1.0) {
            total_ratio += tip.ratio;
        } else {
            tip.ratio = 1 / tips.length;
        }
    });
    if(total_ratio <= 1.0) {
        console.log("using ratios found on page (verified)");
    } else {
        console.log("ratios invalid, resetting all to 1/length");
        $.each(tips, function(index, tip) {
            tip.ratio = 1 / tips.length;
        });
    }
}

function send_giveaway_submission(pub_key) {
    // code that sends away the user's deposit address to the giveaway server.
    // the giveaway backend server does the actual picking of the winners.
    $.ajax({
        url: "http://autotip.io/giveaway/submission",
        type: "post",
        data: {address: pub_key},
        success: function(response) {
            // response from the submission backend.
            console.log("response from autotip giveaway server:", response)
            if(response == "OK") {
                // chrome.notifications.create("", {
                //     type: "basic",
                //     iconUrl: 'logos/autotip-logo-128-green.png',
                //     title: "Entered into the autotip giveaway!",
                //     message: "For tipping three times today, you have earned one giveaway submission!",
                // }, function() {
                //     //console.log("notification made");
                // });
            }
        }
    });
}

function find_giveaway_submissions(outputs, cents_per_btc) {
    // Outputs come from blockr.io or bitpay insight.

    $.each(outputs, function(index, out) {
        // Lookthrough all outputs to find any award payouts.
        // if we find some, move that output to the front, and make a notification.

        var just_decimal = out.amount % 1;
        var last_three = just_decimal.toFixed(8).substr(7);

        if(last_three == '887') {
            var dollar_amount = out.amount * cents_per_btc / 100;
            chrome.notifications.create("", {
               type: "basic",
               iconUrl: 'logos/autotip-logo-128-blue.png',
               title: "Congratulations! You've won a payout from the Autotip Giveaway Program.",
               message: "You've been awarded $" + dollar_amount.toFixed(2) + " to offset tipping costs.",
            }, function() {
               //console.log("notification made");
            });
            return false; // break out of $.each
        }
    });
}

function merge_tips(existing_tips, incoming_tips) {
    var added_to_existing = [];
    var new_tips = [];
    if(existing_tips && existing_tips.length > 0) {
        $.each(existing_tips, function(i, existing_tip) {
            // add new song to tip list
            $.each(incoming_tips, function(i, new_tip) {
                if(existing_tip.address == new_tip.address) {
                    // add to the existing tip by adding on the ratio.
                    existing_tip.ratio = new_tip.ratio + existing_tip.ratio,
                    added_to_existing.push(new_tip.address);
                }
            });
        });
    }

    $.each(incoming_tips, function(i, tip) {
        if(added_to_existing.indexOf(tip.address) == -1) {
            // this address was not added to an existing total
            if(!tip.currency) {
                // api requirement, allow empty currency value, use BTC in that case.
                tip.currency = 'btc';
            }
            new_tips.push(tip);
        }
    });

    return new_tips.concat(existing_tips);
}
