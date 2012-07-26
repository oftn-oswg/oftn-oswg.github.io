"use strict";

(function() {
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
	var params = (window._gaq || (window._gaq = []));
	params.push(["_setAccount", "UA-20491376-1"]);
	params.push(["_trackPageview"]);

	var script = document.createElementNS("http://www.w3.org/1999/xhtml", "script");
	script.type = "application/ecmascript";
	script.src = "//www.google-analytics.com/ga.js";
	document.documentElement.appendChild(script);
})();
