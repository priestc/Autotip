setTimeout(function(){

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if(request.popup_timer) {
            $('#now').val(request.popup_timer);
            return
        }
        if(request.popup_status) {
            $('#status').text(request.popup_status);
            return
        }
    });

    // delay this popup creation process until the chrome popup fade-in effect has finished.
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        var tab_id = tabs[0].id;
        chrome.runtime.sendMessage({get_tips: true, tab: tab_id}, function(response) {
            // when the popup is launched, get list of tips found on the page

            var tips = response.tips;

            chrome.storage.sync.get({
                daily_limit_start: 'none',
                usd_tipped_so_far_today: 0,
                daily_tip_limit: 0.5,
                dollar_tip_amount: 0.05,
                all_tipped_addresses_today: [],
                when_to_send: 'immediately',
            }, function(items) {
                $('#tipping_stats').text("Tipped so far today: $" + items.usd_tipped_so_far_today.toFixed(2));
                var dollar_tip_amount = items.dollar_tip_amount;

                if(tips.length == 1) {
                    var button_text = "Send $" + dollar_tip_amount + " to this address";
                } else {
                    var button_text = "Send $" + dollar_tip_amount + " to these " + tips.length + " addresses";
                }
                $("#tip_button").val(button_text).click(function() {
                    // when the 'tip now' buton is clicked, tell the background to send the tips.
                    chrome.runtime.sendMessage({end_5min_timer: true});
                    chrome.runtime.sendMessage({perform_tip: 'manual', tips: tips});
                });

                chrome.runtime.sendMessage({get_btc_price: true}, function(response) {
                    var btc_price = response.price;
                    normalize_ratios(tips);

                    $.each(tips, function(index, tip) {
                        var img = "<img src='" + get_icon_for_currency(tip.currency) + "' width='50px', height='50px'>";
                        var recipient = "";
                        var ratio = Number(tip.ratio * 100).toFixed(1) + "%";

                        if(tip.recipient) {
                            recipient = "<big>" + tip.recipient + " (" + ratio + ")</big>";
                        }
                        var dollar_ratio = dollar_tip_amount * tip.ratio;
                        var satoshis = Math.floor(dollar_ratio / btc_price * 1e10)
                        var tip_html = "<table class='tip_table'><tr><td>" + img + "</td><td>" + recipient + "<br><small>"
                         + tip.address + "</small></td><td>$" + dollar_ratio.toFixed(2) + "<br>(" + satoshis + ")</td></tr></table>";
                        $("#tip_address").append(tip_html);
                    });
                });
            });
        });
    });
}, 100);
