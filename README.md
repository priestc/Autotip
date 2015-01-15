# Autotip

Autotip is an:

* Open source Google Chrome extension.
* Alternate way for content creators (bloggers, forums posters, artists) to monitize their content.
* HTML5 standards compliant convention (official inclusion to the HTML standard is pending).
* works for Bitcoin and other cryptocurrencies such as Dogecoin, Litecoin and many others.
* is configurable to be sent automatically on each pageload, or only by prompt.

This project written for the Miami Bitcoin hackathon on January 9-10, 2015.

## Setup for tippers

Search for Autotip in the chrome extension store. Once you've installed it, open up the
options page by clicking "options" in the `settings -> extensions` menu:

![screenshot](http://i.imgur.com/OmclWHr.png)

You'll see a deposit address near the bottom. Send a small amount of bitcoin to this
address. $10 to $25 worth of bitcoin is recommended. This extension was not built with
extreme security in mind, so it is advised to not hold large amounts in the extension.

Once the bitcoins have been sent, you'll see the balance show below the private ke

## Setup for content creators

Lets say you're a blogger. You would like to earm money from the audience that reads your blogs.
One way to do this is to put ads on your site. Ads can be easiely blocked, and for users
who don't block them, they do not enjoy looking at either.

Now there is a better way. Create a bitcoin address. Copy the following snippet of code into
the header of

Somewhere in the HTML document of your blog's header, you can add a meta take like this:

    <meta name="microtip" content="1HWpyFJ7N6rvFkq3ZCMiFnqM6hviNFmG5X" data-currency='btc'>

So that the little bit of code gets added to every page. From then on, anyone who has this
extension installed will automatically send a small tip ($0.05 worth by default).
This extension basically

Replace the value of `content` with your bitcoin address.

You can also use altcoin addresses:

    <meta name="microtip" content="Lb78JDGxMcih1gs3AirMeRW6jaG5V9hwFZ" data-currency='ltc'>

Currently, this extension does not support any altcoins, but support is planned.

## APIs used

This extension uses the following APIs:

* Bitcore - creating transactions, generating the deposit address
* Blockr.io - getting unspent outputs, pushing raw transaction to the network
* winkdex- getting current exchange rate
