# Autotip

Autotip is:

* A decentralized cryptocurrency microtipping platform.
* An Open source Google Chrome extension.
* All tips move directly from tipper to tipee with no middleman. (No account required)
* Alternate way for content creators (bloggers, forums posters, artists) to monetize their content.
* HTML5 standards compliant (official inclusion to the HTML standard is [pending](https://github.com/priestc/Autotip/issues/1)).
* A system where you can reiceve Bitcoin and other cryptocurrencies such as Dogecoin, Litecoin and many others.

This project written for the Miami Bitcoin hackathon on January 9-10, 2015.

## Setup for tippers

Search for Autotip in the chrome extension store. Once you've installed it, open up the
extensions page by navigating to `chrome://extensions`:

![screenshot](http://i.imgur.com/8IkKdBK.png?1)

Now click on the options link:

![screenshot](http://i.imgur.com/gximsVJ.png?1)

You'll see a deposit address near the bottom. Send a small amount of bitcoin to this
address. Less than $25 worth of bitcoin is recommended. This extension was not built with
extreme security in mind, so it is advised to not hold large amounts in the extension.

![screenshot](http://i.imgur.com/8ZOpWOk.png)

Once the bitcoins have been sent, you'll see the balance show below the private key.

Now whenever you load a page that has been set up to use the Autotip standard,
your browser will automatically send a very small "microtip" (usually 5 cents or less)
to the person who created the content on the page.

## Setup for content creators

Lets say you're a blogger. You would like to earm money from the audience that reads your blogs.
One way to do this is to put ads on your site. Ads can be easily blocked, and for users
who don't block them, they are annoying to look at.

Getting started using the platform is as easy as adding a snippet of code to every
page that contains content.

Somewhere in the HTML document of your blog's header, you can add a meta take like this:

    <meta name="microtip" content="1HWpyFJ7N6rvFkq3ZCMiFnqM6hviNFmG5X" data-currency='btc' data-recipient="John Doe">

(Replace the value of `content` with your actual bitcoin address. To get started with bitcoin, go to [bitcoin.org](https://bitcoin.org/en/).

You can also use altcoin addresses:

    <meta name="microtip" content="Lb78JDGxMcih1gs3AirMeRW6jaG5V9hwFZ" data-currency='ltc'>

## Multiple tipping addresses per page

The standard also permits the use of multiple tip addresses. In the case that the extension finds
multiple tip addresses, the tip gets split amoung each address equally.

Currently, this extension does not support sending tips to altcoin addresses, but support is planned.

## Full meta tag specification

The following attributes are associated with the meta tag specification:

| Attribute      |          | Description |
|----------------|----------|-------------|
| name           | required | always "microtip"
| content        | required | The private key of the cryptocurrency address of the person who will recieve tips.
| data-currency  | optional | The name of the currency. Examples: `BTC`, `LTC`, also you can write the whole name of the curency, such as "dogecoin", and "peercoin". Case insensitive. If left blank, `BTC` is implied.
| data-recipient | optional | Human readable name of the person who will revieve the tips. Can be a person's name or just "Development team". The purpose of this field is to be shown to the tipping user at the time of making the tip.
| data-ratio   |  optional | Only applicable if there are multiple microtip tags on a single page. This attribute tells the tiping extension how much of the tip should go to this address. The value should be a decimal number between 0 and 1.0. All ratio values must add up to less than or equal to 1.0.

## Examples

One single Litecoin address, all going to the "Development Team" wallet address.

    <meta name="microtip" content="Lb78JDGxMcih1gs3AirMeRW6jaG5V9hwFZ" data-currency='ltc' data-recipient="Development Team">

Two different bitcoin address. Half going to Bob, the other half going to Terry. (Bitcoin currency is implied)

    <meta name="microtip" content="1HWpyFJ7N6rvFkq3ZCMiFnqM6hviNFmG5X" data-recipient="Bob">
    <meta name="microtip" content="1DCzzFuW33YJv9RGUMHyvgaoTdcNkwGMeR" data-recipient="Terry">

Same as above, but 80% of all tips goes to Terry, 20% goes to Bob.

    <meta name="microtip" content="1HWpyFJ7N6rvFkq3ZCMiFnqM6hviNFmG5X" data-recipient="Bob" data-ratio="0.2">
    <meta name="microtip" content="1DCzzFuW33YJv9RGUMHyvgaoTdcNkwGMeR" data-recipient="Terry" data-ratio="0.8">

To see some pages with these meta tags, checkout these test pages (all addreses belong to the Autotip project)

* [Multiple BTC addresses](http://priestc.github.io/Autotip/test_double.html)
* [Litecoin tip address](http://priestc.github.io/Autotip/test_altcoin.html)
* [Peercoin and Dogecoin](http://priestc.github.io/Autotip/test_peercoin_dogecoin.html)


## APIs used

This extension uses the following APIs:

* [Bitcore](http://bitcore.io) - creating transactions, generating the deposit address
* [Blockr.io](http://blockr.io) - pushing raw transaction to the network
* [Bitpay Insight](https://insight.bitpay.com/) - getting unspent outputs.
* [Winkdex](https://winkdex.com) - getting current exchange rate
* [Blockchain.info](http://blockchain.info) - getting balance of an address.
