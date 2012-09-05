var ΩF_0 = ΩF_0 || {};

ΩF_0.Accordian = function(element) {
	var self;

	self = this;
	this.element = element;
	this.convert ();

	if (window.addEventListener) {
		window.addEventListener ("hashchange", hashchange);
	} else if (window.attachEvent) {
		window.attachEvent ("onhashchange", hashchange);
	}

	function hashchange() {
		var ref, panel;

		ref = document.querySelector (location.hash);
		panel = self.find_relevant_panel (ref);

		if (panel && self.is_hidden (panel)) {
			self.toggle (panel);
		}
	}
};

ΩF_0.Accordian.prototype.convert = function() {
	var children, panel, panel_open, ref;

	children = this.element.getElementsByClassName ("accordian-panel");

	panel_open = children[0];
	if (location.hash) {
		ref = document.querySelector (location.hash);
		panel = this.find_relevant_panel (ref);
		if (panel) {
			panel_open = panel;
		}
	}

	for (var i = 0, len = children.length; i < len; i++) {
		panel = children[i];
		this.create_panel (panel, panel !== panel_open);
	}
};

ΩF_0.Accordian.prototype.find_relevant_panel = function (ref) {
	while (ref) {
		if (ref.classList && ref.classList.contains ("accordian-panel")) {
			return ref;
		}
		ref = ref.nextSibling;
	}
	return null;
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
