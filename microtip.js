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

var tips = get_tips();
if(tips.length > 0) {
    chrome.runtime.sendMessage({found_tips: tips});
    console.log("found " + tips.length + " microtips on this page");
}
