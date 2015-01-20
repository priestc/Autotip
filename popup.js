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
        }, function(items) {

            $('#status').text("Tipped so far today: $" + items.usd_tipped_so_far_today.toFixed(2));

            $("#now").click(function() {
                // when the 'tip now' buton is clicked, tell the background to send the tips.
                chrome.runtime.sendMessage({perform_tip: "manual", tips: tips}, function(response) {
                    // when all tips have been sent, log so the user knows.
                    console.log("sent " + tips.length + " tips!");
                });
            });

            $.each(tips, function(index, tip) {
                var ratio = "100%";
                var recipient = "";
                if(tip.ratio) {
                    ratio = Number(tip.ratio * 100).toFixed(1) + "%";
                }
                if(tip.recipient) {
                    recipient = "<big>" + tip.recipient + " (" + ratio + ")</big><br>";
                }

                var img = "<img src='" + get_icon_for_currency(tip.currency) + "' width='50px', height='50px'>";
                var tip_html = recipient + img + "<small>" + tip.address + "</small><br><br>";
                $("#tip_address").append(tip_html);
            });
        });
    });
});
