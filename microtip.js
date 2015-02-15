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

// testcases:
// pass_blacklist_and_whitelist('whitelist', ['aa', 'bb'], 'aa') == true; // in whitelist
// pass_blacklist_and_whitelist('whitelist', ['aa', 'bb'], 'xx') == false; // not in whitelist
// pass_blacklist_and_whitelist('blacklist', ['aa', 'bb'], 'aa') == false; // in blacklist
// pass_blacklist_and_whitelist('blacklist', ['aa', 'bb'], 'cc') == true; // not in blacklist
function pass_blacklist_and_whitelist(setting, domains, this_domain) {
    // setting: either 'blacklist' or 'whitelist'
    // domains: list of strings (domain's that make up the white/blacklist)
    // this_domain: the domain that this page is on
    // returns: true or false, depending on whether this_domain passes or fails the black/whitelist

    for(var i = 0; i < domains.length; i++) {
        var domain = domains[i];
        if(domain == this_domain) {
            return setting == 'whitelist';
        }
    };

    return setting == 'blacklist';
}


chrome.storage.sync.get({
    when_to_send: null,
    blacklist_or_whitelist: null,
    domain_list: null,
    interval_seconds: null
}, function(items) {
    var tips = get_tips();
    if(tips.length <= 0) {
        return // No tips found
    }

    var pblwl = true;
    if(items.blacklist_or_whitelist != 'none') {
        // determine if this page's domain jives with the users black/whitelists.
        var pblwl = pass_blacklist_and_whitelist(
            items.blacklist_or_whitelist, items.domain_list, window.location.host
        )
    }

    if(!pblwl) {
        console.log("Autotip canceled because of", items.blacklist_or_whitelist);
        console.log(window.location.host, "->", items.domain_list);
        chrome.runtime.sendMessage({
            mode: 'blocked_by_' + items.blacklist_or_whitelist,
            domain: window.location.host,
        });
    } else if(items.blacklist_or_whitelist != 'none') {
        chrome.runtime.sendMessage({
            mode: 'allowed_by_' + items.blacklist_or_whitelist,
            domain: window.location.host,
        });
    }

    console.log("Autotip extension found " + tips.length + " microtip meta tags on this page");
    chrome.runtime.sendMessage({found_tips: tips});

    if(pblwl && items.when_to_send == '5mins') {
        var five_minute_counter_start = new Date();
        intervalID = setInterval(function() {
            // update popup status every 1 second. After 5 minutes (or whatever the setting is), make the tip
            var seconds_to_go = Math.floor(items.interval_seconds - ((new Date() - five_minute_counter_start) / 1000));
            if(seconds_to_go <= 0) {
                chrome.runtime.sendMessage({tips: tips, perform_tip: 'auto'});
                console.log(items.interval_seconds, 'seconds past, will try to make tip.');
                clearInterval(intervalID);
            } else {
                var msg = "Sending tip in " + seconds_to_go + " Seconds";
                chrome.runtime.sendMessage({popup_timer: msg});
            }
        }, 1000);
    } else if(pblwl && items.when_to_send == 'immediately') {
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
