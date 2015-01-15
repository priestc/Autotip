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
extensions page by navigating to chrome:extensions:

![screenshot](http://i.imgur.com/8IkKdBK.png?1)

Now click on the options link:

![screenshot](http://i.imgur.com/gximsVJ.png?1)

You'll see a deposit address near the bottom. Send a small amount of bitcoin to this
address. Less than $25 worth of bitcoin is recommended. This extension was not built with
extreme security in mind, so it is advised to not hold large amounts in the extension.

Once the bitcoins have been sent, you'll see the balance show below the private key.

Now whenever you load a page that has been set up to use the Autotip standard,
your browser will automatically send a very small "microtip" (usually 5 cents or less)
to the person who created the content on the page.

## Setup for content creators

Lets say you're a blogger. You would like to earm money from the audience that reads your blogs.
One way to do this is to put ads on your site. Ads can be easely blocked, and for users
who don't block them, they are annoying to look at.

Getting started using the platform is as easy as adding a snippet of code to every
page that contains content.

Somewhere in the HTML document of your blog's header, you can add a meta take like this:

    <meta name="microtip" content="1HWpyFJ7N6rvFkq3ZCMiFnqM6hviNFmG5X" data-currency='btc'>


(Replace the value of `content` with your actual bitcoin address. To get started with bitcoin, go here: )

You can also use altcoin addresses:

    <meta name="microtip" content="Lb78JDGxMcih1gs3AirMeRW6jaG5V9hwFZ" data-currency='ltc'>

Currently, this extension does not support sending tips to altcoin addresses, but support is planned.

## APIs used

This extension uses the following APIs:

* Bitcore - creating transactions, generating the deposit address
* Blockr.io - getting unspent outputs, pushing raw transaction to the network
* winkdex- getting current exchange rate
