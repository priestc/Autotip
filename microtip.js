var tips_on_this_page = [];

$("meta[name=microtip]").each(function(index, element) {
    var e = $(element);
    tips_on_this_page.push({
        'currency': e.data('currency'),
        'address': e.attr('content')
    });
});

if(tips_on_this_page.length > 0) {
    chrome.runtime.sendMessage({found_tips: tips_on_this_page});
    console.log("found " + tips_on_this_page.length + " microtips");
}
