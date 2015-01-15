chrome.runtime.sendMessage({get_tips: true}, function(response) {
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
        $("#tip_address").append(tip.address + " ");
    }
});
