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
    when_to_send: 'ask',
}, function(items) {
    var tips = get_tips();
    if(tips.length <= 0) {
        return // No tips found
    }

    if(items.when_to_send == 'ask') {
        // Prime the popup for manual tip
        chrome.runtime.sendMessage({found_tips: tips});
        console.log("found " + tips.length + " microtips on this page");
    } else if(items.when_to_send == 'immediately') {
        // go ahead and make the tip automatically.
        chrome.runtime.sendMessage({found_tips: tips, perform_tip: 'immediately'});
    }
});
