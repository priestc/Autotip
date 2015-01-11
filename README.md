# microtip-extension

## To install the extension:

run this command

    git clone https://github.com/priestc/microtip-extension.git

now go to chrome, open up the settings page, then the extensions tab. Click on the
"Load unpacked extension..." button, and give it the `microtip-extension` folder.

Now go to the options page for the extension, and send bitcoin to the deposit address
shown.

![screenshot](http://i.imgur.com/OmclWHr.png)


## Website owners who would like to recieve tips

Add a microtip meta tag to your page:

    <meta name="microtip" content="1HWpyFJ7N6rvFkq3ZCMiFnqM6hviNFmG5X" data-currency='btc'>

Replace the value of `content` with your bitcoin address.

You can also use altcoin addresses:

    <meta name="microtip" content="Lb78JDGxMcih1gs3AirMeRW6jaG5V9hwFZ" data-currency='ltc'>

Currently, this extension does not support any altcoins, but support is planned.
