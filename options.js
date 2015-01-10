// Saves options to chrome.storage
function save_options() {
    var when_to_send = $("input[name=when_to_send]:checked").val();
    var tip_amount = $('input[name=tip_amount]').val();

    console.log("saving", when_to_send, tip_amount);

    chrome.storage.sync.set({
        when_to_send: when_to_send,
        tip_amount: tip_amount
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        when_to_send: '5min',
        tip_amount: 0.0001
    }, function(items) {
        console.log(items);
        $('input[name=when_to_send][value=' + items.when_to_send + ']').attr('checked', 'checked');
        $('input[name=tip_amount]').val(items.tip_amount);
    });
}

$('#save').on('click', save_options);
restore_options();
