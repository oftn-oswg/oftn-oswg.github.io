"use strict";

/*
 * Use "latin capital letter o with stroke" in the title due to most
 * operating systems having bad font support for the empty set character.
 */
if (!/bot\b/.test(navigator.userAgent)) {
	document.title = document.title.replace(/∅/g, "Ø");
}

/*
 * Add Google Analytics' tracking script
 */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-20491376-1']);
_gaq.push(['_setDomainName', 'oftn.org']);
_gaq.push(['_trackPageview']);
