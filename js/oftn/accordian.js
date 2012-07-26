var ΩF_0 = ΩF_0 || {};

ΩF_0.Accordian = function(element) {
	this.element = element;
	this.convert ();
};

ΩF_0.Accordian.prototype.convert = function() {
	var children;

	children = this.element.getElementsByClassName ("accordian-panel");
	for (var i = 0, len = children.length; i < len; i++) {
		this.create_panel (children[i], i !== 0);
	}
};

ΩF_0.Accordian.prototype.create_panel = function(element, hide) {
	var
	  header = element
	, open = "accordian-header open"
	, closed = "accordian-header closed"
	;

	do {
		header = header.previousSibling;
	} while (header.nodeType === 3);
	header.className = open;

	if (hide) {
		this.hide (element);
		header.className = closed;
	}

	var self = this;
	header.onclick = function() {
		if (self.is_hidden (element)) {
			self.scroll (this);
			header.className = open;
		} else {
			header.className = closed;
		}
		self.toggle (element);
	}
};

ΩF_0.Accordian.prototype.is_hidden = function(element) {
	return element.style.display === "none";
};

if (typeof jQuery === "undefined") {
	ΩF_0.Accordian.prototype.scroll = function(element) { /* nothing */ };
	ΩF_0.Accordian.prototype.hide = function(element) { element.style.display = "none"; };
	ΩF_0.Accordian.prototype.toggle = function(element) {
		if (this.is_hidden(element)) {
			element.style.display = "block";
		} else {
			this.hide(element);
		}
	};
} else {
	ΩF_0.Accordian.prototype.scroll = function(element) {
		jQuery("html, body").animate({scrollTop: $(element).offset().top}, 600);
	};
	ΩF_0.Accordian.prototype.hide = function(element) {
		jQuery(element).hide ();
	};

	ΩF_0.Accordian.prototype.toggle = function(element) {
		jQuery(element).slideToggle (600);
	};
}
