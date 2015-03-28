chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("received message in popup!!!", request);

    if(request.popup_timer) {
        $('#timer_area').text(request.popup_timer);
        return
    }
    if(request.popup_status) {
        var s = $('#status');

        if(request.fail) {
            s.css({background: 'darkred', color: 'white'});
            s.html("<strong>Error:</strong><br>" + request.popup_status);
        } else {
            s.css({background: 'lightgreen', color: 'black'});
            s.text(request.popup_status);
        }
    }
});

setTimeout(function(){
    // delay this popup creation process until the chrome popup fade-in effect has finished.
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        var tab_id = tabs[0].id;
        chrome.runtime.sendMessage({get_tips: true, tab: tab_id}, function(response) {
            // when the popup is launched, get list of tips found on the page

            $("#whitelist_blacklist_button_area").show().append(response.button);

            $(".remove, .add").on('click', function() {
                console.log('clicked domain list button');
                $(this).hide();
                if($(this).hasClass('add')) {
                    var add_or_remove = 'add'
                } else {
                    var add_or_remove = 'remove'
                }

                chrome.runtime.sendMessage({
                    domain: $(this).data('domain'),
                    add_or_remove: add_or_remove
                });
            });

            $("#options_link").attr('href', chrome.extension.getURL("options.html"));

            var tips = response.tips;

            chrome.storage.sync.get({
                daily_limit_start: null,
                usd_tipped_so_far_today: null,
                daily_tip_limit: null,
                dollar_tip_amount: null,
                all_tipped_addresses_today: null,
                when_to_send: null,
                pub_key: null,
            }, function(items) {
                $("#qr").qrcode({width: 100, height: 100, text: items.pub_key});
                $("#tip_history").attr('href', 'https://blockchain.info/address/' + items.pub_key)

                var dollar_tip_amount = items.dollar_tip_amount;

                if(tips.length == 1) {
                    var button_text = "Send $" + dollar_tip_amount + " to this address";
                } else {
                    var button_text = "Send $" + dollar_tip_amount + " to these " + tips.length + " addresses";
                }
                $("#tip_button").val(button_text).click(function() {
                    // when the 'tip now' buton is clicked, tell the background to send the tips.
                    // and prime the status box.
                    $(this).attr('disabled', 'disabled');
                    $('#status').show().text("Creating Transaction...").css({background: 'lightgreen', color: 'black'});
                    chrome.runtime.sendMessage({end_5min_timer: true});
                    chrome.runtime.sendMessage({perform_tip: 'manual', tips: tips});
                });

                chrome.runtime.sendMessage({get_btc_price: true}, function(response) {
                    var btc_price = response.price;
                    if(btc_price < 0) {
                        //when call to winkdex fails, -1 is returned
                        $('#tipping_stats').html("Network Error");
                        return
                    }

                    $.ajax({
                        url: "https://blockchain.info/rawaddr/" + items.pub_key,
                        type: "get",
                        success: function(response) {
                            var deposit_btc = response['final_balance'] / 1e10;
                            var deposit_usd = (deposit_btc * btc_price).toFixed(2);
                            var msg = "Tipped so far today: <strong>$" + items.usd_tipped_so_far_today.toFixed(2) + "</strong>";
                            msg += "<br><strong>$" + deposit_usd + "</strong> Remaining on deposit address";
                            $('#tipping_stats').html(msg);
                            $('#tipping_stats .spinner').hide();
                        },
                        error: function(xhr, status, error) {
                            $('#tipping_stats').html("Network Error: " + status + error);
                        }
                    });

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
