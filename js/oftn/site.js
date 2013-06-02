"use strict";

/*
 * Use "latin capital letter o with stroke" in the title due to most
 * operating systems having bad font support for the empty set character.
 */
if (!/bot\b/.test(navigator.userAgent)) {
	document.title = document.title.replace(/∅/g, "Ø");
}

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-20491376-1');
ga('send', 'pageview');
