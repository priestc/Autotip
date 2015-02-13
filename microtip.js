var intervalID;

function get_tips() {
    var tips_on_this_page = [];
    $("meta[name=microtip]").each(function(index, element) {
        var e = $(element);
        tips_on_this_page.push({
            'currency': e.data('currency'),
            'address': e.attr('content'),
            'ratio': e.data('ratio'),
            'recipient': e.data('recipient')
        });
    });
    return tips_on_this_page
}

chrome.storage.sync.get({
    when_to_send: null,
    blacklist_or_whitelist: null,
    domain_list: null
}, function(items) {
    var tips = get_tips();
    if(tips.length <= 0) {
        return // No tips found
    }

    console.log("Autotip extension found " + tips.length + " microtip meta tags on this page");
    chrome.runtime.sendMessage({found_tips: tips});

    if(items.when_to_send == '5mins') {
        var five_minute_counter_start = new Date()
        intervalID = setInterval(function() {
            // update popup status every 1 second. After 5 minutes, make the tip
            var seconds_to_go = Math.floor((5 * 60) - ((new Date() - five_minute_counter_start) / 1000));
            if(seconds_to_go <= 0) {
                chrome.runtime.sendMessage({tips: tips, perform_tip: 'auto'});
                console.log('5 minutes past, tip made');
                clearInterval(intervalID);
            } else {
                var msg = "Sending tip in " + seconds_to_go + " Seconds"
                chrome.runtime.sendMessage({popup_timer: msg});
            }
        }, 1000);
    } else if(items.when_to_send == 'immediately') {
        // go ahead and make the tip automatically.
        chrome.runtime.sendMessage({tips: tips, perform_tip: 'auto'});
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("content script got message");
        if(request.end_5min_timer) {
            clearInterval(intervalID);
        }
    });

});
