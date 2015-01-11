# microtip-extension

This extension was written for the Miami Bitcoin hackathon on January 9-10, 2015.

## To install the extension:

run this command

    git clone https://github.com/priestc/microtip-extension.git

now go to chrome, open up the settings page, then the extensions tab. Click on the
"Load unpacked extension..." button, and give it the `microtip-extension` folder.

Now go to the options page for the extension, and send bitcoin to the deposit address
shown.

![screenshot](http://i.imgur.com/OmclWHr.png)


## Website owners who would like to receive tips

Add a microtip meta tag to your page (anywhere in the `head` or `body` of the document):

    <meta name="microtip" content="1HWpyFJ7N6rvFkq3ZCMiFnqM6hviNFmG5X" data-currency='btc'>

Replace the value of `content` with your bitcoin address.

You can also use altcoin addresses:

    <meta name="microtip" content="Lb78JDGxMcih1gs3AirMeRW6jaG5V9hwFZ" data-currency='ltc'>

Currently, this extension does not support any altcoins, but support is planned.

## API's used

This extension uses the following APIs:

* Bitcore - creating transactions, generating the deposit address
* Blockr.io - getting unspent outputs, pushing raw transaction to the network
* winkdex- getting current exchange rate
