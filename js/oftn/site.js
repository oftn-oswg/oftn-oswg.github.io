"use strict";

/*
 * Use "latin capital letter o with stroke" in the title due to most
 * operating systems having bad font support for the empty set character.
 */
if (!/bot\b/.test(navigator.userAgent)) {
	document.title = document.title.replace(/∅/g, "Ø");
}
