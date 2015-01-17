chrome.tabs.query({
    active: true,
    currentWindow: true
}, function(tabs) {
    var tab_id = tabs[0].id;
    chrome.runtime.sendMessage({get_tips: true, tab: tab_id}, function(response) {
        var tips = response.tips;

        // when the popup is launched, get list of tips found on the page

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

            var tip_html = recipient + "<small>" + tip.address + "</small><br><br>"
            $("#tip_address").append(tip_html);
        });
    });
});
