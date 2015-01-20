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
        return chrome.extension.getURL('orange-bitcoin-38.png');
    }
    if(cleaned == 'ltc') {
        return chrome.extension.getURL('litecoin-128.png');
    }
    if(cleaned == 'doge') {
        return chrome.extension.getURL('dogecoin-128.png');
    }
    if(cleaned == 'ppc') {
        return chrome.extension.getURL('gold-peercoin-250.png');
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
    return outputs
}

function unspent_outputs(pub_key) {
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
    return outputs
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
    return ssio_address
}
