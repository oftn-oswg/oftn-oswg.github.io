"use strict";

var suit = {};

// When set to a suit.Window object, events are channeled directly to it.
suit.lock = null;

suit.widgets = []; // Mapping of unique id's to widgets

suit.unique = (function() {
	var unique = 1;
	return function() {
		return unique++;
	};
})();

suit.register = function(widget, event, event_dom) {

	if (widget.event && widget.event (event)) {
		event_dom.stopPropagation();
		event_dom.preventDefault();
		return false;
	}

	return true;
};

suit.DomEvent = {
	MouseDown:    1,
	MouseUp:      2,
	MouseMove:    4,
	MouseWheel:   8,
	ContextMenu: 16,
	TouchStart:  32,
	TouchEnd:    64,
	TouchMove:  128
};


suit.get_relevant_widget = function(event, mask, no_lock) {
	var target, widget;

	if (!no_lock && suit.lock) return suit.lock;

	target = event.target || event.srcElement;
	if (target.nodeType === 3) target = target.parentNode;

	do {
		if (!target.suit_unique) return null;

		widget = suit.widgets[target.suit_unique];
		if (widget.event_mask & mask || mask === suit.Event.None) break;

		if (target.suit_empty) target = target.parentNode.firstChild;
		else target = target.parentNode.parentNode.firstChild;

	} while (target);

	return widget;
};


suit.get_event_position = function(event, target) {
	var x, y, box;
	
	x = 0;
	y = 0;

	if (event.pageX || event.pageY) {
		x = event.pageX;
		y = event.pageY;
	} else if (event.clientX || event.clientY) {
		x = event.clientX + document.body.scrollLeft
			+ document.documentElement.scrollLeft;
		y = event.clientY + document.body.scrollTop
			+ document.documentElement.scrollTop;
	}

	box = target.getBoundingClientRect();
	x -= box.top;
	y -= box.left;

	return {x: x, y: y};
};


suit.get_event_button = function(event) {
	var right_click;
	
	right_click = false;
	if (event.which) right_click = (event.which == 3);
	else if (event.button) right_click = (event.button == 2);
	return right_click ? 3 : 1;
};


suit.do_event = function(type, event) {
	var widget, target, pos, stype;

	switch (type) {
	case suit.DomEvent.MouseDown:
	case suit.DomEvent.MouseUp:

		stype = (type === suit.DomEvent.MouseDown) ?
			suit.Event.ButtonPress :
			suit.Event.ButtonRelease;

		widget = suit.get_relevant_widget (event, stype);
		if (!widget) return true;

		target = widget.window.base;
		pos = suit.get_event_position (event, target);
		button = suit.get_event_button (event);
		
		return suit.register (
			widget,
			new suit.EventButton (
				stype,
				suit.Modifiers.None,
				button, pos.x, pos.y, -1),
			event);

		break;

	case suit.DomEvent.MouseMove:
	
		widget = suit.get_relevant_widget (event, suit.Event.Motion);
		if (!widget) return true;

		target = widget.window.base;
		pos = suit.get_event_position (event, target);

		return suit.register (
			widget,
			new suit.EventMotion (
				suit.Modifiers.None,
				pos.x, pos.y, -1),
			event);

		break;

	case suit.DomEvent.MouseWheel:

		var deltaX = 0, deltaY = 0;

		if (event.wheelDelta) {
			if (event.wheelDeltaX || event.wheelDeltaY) {
				deltaX = event.wheelDeltaX;
				deltaY = event.wheelDeltaY;
			} else {
				deltaY = event.wheelDelta;
			}
		} else if (event.axis === event.HORIZONTAL_AXIS) {
			deltaX = -event.detail;
		} else if (event.axis === event.VERTICAL_AXIS) {
			deltaY = -event.detail;
		}
		
		if (deltaX === 0 && deltaY === 0) return false;

		widget = suit.get_relevant_widget (event, suit.Event.Scroll);
		if (!widget) return true;
		
		target = widget.window.base;
		pos = suit.get_event_position (event, target);

		return suit.register (
			widget,
			new suit.EventScroll (
				suit.Modifiers.None,
				pos.x, pos.y, deltaX, deltaY, -1),
			event);

		break;

	default:
		suit.warn ("Unhandled event: "+type);
		
	}
};

suit.init = function() {

	addEventListener("mousedown", function(event) {
		return suit.do_event(suit.DomEvent.MouseDown, event || window.event);
	}, false);

	addEventListener("mouseup", function(event) {
		return suit.do_event(suit.DomEvent.MouseUp, event || window.event);
	}, false);

	addEventListener("MozMousePixelScroll", function(event) {
		return suit.do_event(suit.DomEvent.MouseWheel, event || window.event);
	}, false)

	addEventListener("mousewheel", function(event) {
		return suit.do_event(suit.DomEvent.MouseWheel, event || window.event);
	}, false);
;
	addEventListener("mousemove", function(event) {
		return suit.do_event(suit.DomEvent.MouseMove, event || window.event);
	}, false);

	addEventListener("touchstart", function(event) {
		return suit.do_event (suit.DomEvent.TouchStart, event || window.event);
	}, false);

	addEventListener("touchend", function(event) {
		return suit.do_event (suit.DomEvent.TouchEnd, event || window.event);
	}, false);

	addEventListener("touchmove", function(event) {
		return suit.do_event (suit.DomEvent.TouchMove, event || window.event);
	}, false);

	addEventListener("contextmenu", function(event) {
		var widget;

		widget = suit.get_relevant_widget (event, suit.Event.None, true);
		if (widget) {
			event.stopPropagation();
			event.preventDefault();
			return false;
		}

	}, false);

};

suit.ensure = function(variable, expect) {
	var type = typeof variable;
	
	if (Array.isArray(expect)) {
		return;
	}
	
	if (typeof expect === "string") {
		if (type !== expect) {
			throw new Error("Failed type check. Was expecting `"+expect+"` but got `"+type+"`.");
		}
	} else if (typeof expect === "function") {
		var hrtype = type;
		if (type === "object") {
			hrtype = "object of " +
				(variable.constructor.name?variable.constructor.name:"[object Function]");
		} 
		if (!(variable instanceof expect)) {
			throw new Error("Failed type check. Was expecting instance of `" +
				(expect.name?expect.name:"[object Function]")+"` but got `"+hrtype+"`.");
		}
	}
};

//addEventListener("error", function(e){ console.log(e.stack); }, 0);

Function.prototype.inherit = (function() {
	if (typeof Object.create === "function") {
		return function(base) {
			this.prototype = Object.create(base.prototype, {
				constructor: {
					value: this,
					enumerable: false,
					writable: true,
					configurable: true
				}
			});
		};
	}

	if (typeof Object.defineProperties === "function") {
		return function(base) {
			var dummy = function() {};
			dummy.prototype = base.prototype;
			
			this.prototype = new dummy;
			Object.defineProperties(this.prototype, {
				constructor: {
					value: this,
					enumerable: false,
					writable: true,
					configurable: true
				}
			});
		};
	}
	
	return function(base) {
		var dummy = function() {};
		dummy.prototype = base.prototype;
		
		this.prototype = new dummy;
		this.prototype.constructor = this;
	};
})();

if (!Function.prototype.bind) {
	Function.prototype.bind = function( obj ) {
		var slice = [].slice,
			args = slice.call(arguments, 1),
			self = this,
			nop = function () {},
			bound = function () {
				return self.apply( this instanceof nop ? this : ( obj || {} ), 
					args.concat( slice.call(arguments) ) );
			};
		nop.prototype = self.prototype;
		bound.prototype = new nop();
		return bound;
	};
}

if (!Array.isArray) {
	Array.isArray = function(o) {
		return Object.prototype.toString.call(o) === "[object Array]";
	};
}

suit.Event = {
	None: 0,
	
	ButtonPress: 1,
	ButtonRelease: 2,
	ButtonDblPress: 4,

	KeyPress: 8,
	KeyRelease: 16,
	
	Scroll: 32,
	
	Motion: 64
};

suit.Modifiers = {
	None: 0,
	Shift: 1,
	CapsLock: 2,
	Ctrl: 4,
	Alt: 8,
	Super: 16
};

// Keyboard button events
suit.EventKey = function SUITEventKey(type, state, keycode) {
	suit.ensure(type, "number");
	suit.ensure(state, "number");
	suit.ensure(keycode, "number");

	this.type = type; // KeyPress | KeyRelease
	//this.time = new Date(); // Time the event was generated
	this.state = state; // (Modifiers -- shift, ctrl, capslock, alt)
	this.keycode = keycode; // The key code
};
suit.EventKey.prototype.name = "event_key";

// Mouse button events
suit.EventButton = function SUITEventButton(type, state, button, x, y, id) {
	suit.ensure(type, "number");
	suit.ensure(state, "number");
	suit.ensure(button, "number");
	suit.ensure(x, "number");
	suit.ensure(y, "number");
	suit.ensure(id, "number");
	
	this.type = type; // ButtonPress | ButtonRelease | ButtonDblPress
	//this.time = new Date(); // Time the event was generated
	this.state = state; // (Modifiers -- shift, ctrl, capslock, alt)
	this.button = button; // Left click: 1, Middle click: 2, Right click: 3
	this.x = x; // x-coordinate of mouse when event occured
	this.y = y; // y-coordinate of mouse when event occured
	this.id = id; // Used for multitouch
};
suit.EventButton.prototype.name = "event_button";

// Mouse wheel scroll events
suit.EventScroll = function SUITEventScroll(state, x, y, deltax, deltay, id) {
	suit.ensure(state, "number");
	suit.ensure(x, "number");
	suit.ensure(y, "number");
	suit.ensure(deltax, "number");
	suit.ensure(deltay, "number");
	suit.ensure(id, "number");
	
	this.type = suit.Event.Scroll;
	//this.time = new Date(); // Time the event was generated
	this.state = state; // (Modifiers -- shift, ctrl, capslock, alt)
	this.x = x; // x-coordinate of mouse when event occured
	this.y = y; // y-coordinate of mouse when event occured
	this.deltaX = deltax; // amount of scroll horizontally
	this.deltaY = deltay; // amount of scroll vertically
	this.id = id; // Used for multitouch
};
suit.EventScroll.prototype.name = "event_scroll";

// Move move events
suit.EventMotion = function SUITEventMotion(state, x, y, id) {
	suit.ensure(state, "number");
	suit.ensure(x, "number");
	suit.ensure(y, "number");
	suit.ensure(id, "number");
	
	this.type = suit.Event.Motion;
	//this.time = new Date(); // Time the event was generated
	this.state = state; // (Modifiers -- shift, ctrl, capslock, alt)
	this.x = x; // x-coordinate of mouse when event occured
	this.y = y; // y-coordinate of mouse when event occured
	this.id = id; // Used for multitouch
};
suit.EventMotion.prototype.name = "event_motion";

suit.Allocation = function SUITAllocation(x, y, width, height) {
	suit.ensure(x, "number");
	suit.ensure(y, "number");
	suit.ensure(width, "number");
	suit.ensure(height, "number");

	this.x = x | 0;
	this.y = y | 0;
	this.width = width > 1 ? width | 0 : 1;
	this.height = height > 1 ? height | 0 : 1;
};

suit.Allocation.prototype.args = function() {
	return [this.x, this.y, this.width, this.height];
};

suit.Allocation.prototype.toString = function() {
	var a = this;
	return "("+a.x+", "+a.y+") "+a.width+"x"+a.height;
};

suit.Allocation.prototype.copy_shrink = function(inset) {
	return new suit.Allocation(this.x + inset, this.y + inset, this.width - (inset<<1), this.height - (inset<<1));
};

suit.Object = function SUITObject() {
	this.signals = {};
};

suit.Object.prototype.connect = function( signal, fn ) {
	suit.ensure(signal, "string");
	suit.ensure(fn, "function");

	if( typeof this.signals[signal] == 'undefined' ) {
		this.signals[signal] = [];
	}
	this.signals[signal].push({
		'callback': fn,
		'extras': Array.prototype.slice.call(arguments, 2)
	});
	return this;
};

suit.Object.prototype.disconnect = function( signal, fn ) {
	suit.ensure(signal, "string");
	suit.ensure(fn, "function");

	if( typeof this.signals[signal] == 'undefined' )
		return this;

	for( var i = 0, len = this.signals[signal].length; i < len; i++ ) {
		if( this.signals[signal][i]['callback'] === fn ) {
			this.signals[signal].splice(i, 1);
			return this;
		}
	}

	return this;

};

suit.Object.prototype.emit = function( signal ) {
	suit.ensure(signal, "string");

	if( typeof this.signals[signal] == 'undefined' )
		return false;

	var args = Array.prototype.slice.call(arguments, 1);

	for( var i = 0, len = this.signals[signal].length; i < len; i++ ) {
		this.signals[signal][i]['callback'].apply(this,
			args.concat(this.signals[signal][i]['extras']));
	}
	return this;

};

suit.Window = function SUITWindow(parent, widget, empty) {
	var base, canvas, context, unique;

	suit.ensure (parent, "object");
	if (!parent) throw new Error("suit.Window requires a parent");

	suit.Object.call(this);

	unique = suit.unique();

	base = document.createElement("div");
	base.className = "suit suit_"+widget.name;
	base.style.top = 0;
	base.style.left = 0;

	if (!empty) {
		canvas = document.createElement("canvas");
		canvas.suit_unique = unique;
		context = new suit.Graphics(canvas.getContext("2d"));
		base.appendChild(canvas);
	} else {
		base.suit_unique = unique;
		base.suit_empty = true;
	}

	this.base = base;
	this.unique = unique;
	this.parent = parent;
	this.canvas = canvas;
	this.widget = widget;
	this.context = context;

	if (typeof parent.appendChild === "function") {
		parent.appendChild (base);
	} else {
		parent.add_window (this);
	}

	if (widget) {
		suit.widgets[unique] = widget;
	}

};

suit.Window.inherit (suit.Object);

// We need a reference back to the widget.
suit.Window.prototype.widget = null;
suit.Window.prototype.x = 0;
suit.Window.prototype.y = 0;
suit.Window.prototype.width = 0;
suit.Window.prototype.height = 0;

suit.Window.prototype.destroy = function() {
	var parent;

	parent = this.parent;
	if (typeof parent.removeChild === "function") {
		parent.removeChild (this.base);
	} else {
		parent.remove_window (this);
	}

	if (this.widget) {
		delete suit.widgets[this.unique];
	}
};


suit.Window.prototype.reparent = function(parent) {
	var base, parent;

	base = this.base.parentNode.removeChild (this.base);

	if (typeof parent.appendChild === "function") {
		parent.appendChild (base);
	} else {
		parent.add_window (this);
	}

	this.parent = parent;

};


suit.Window.prototype.add_window = function(window) {
	this.base.appendChild (window.base);
};


suit.Window.prototype.remove_window = function(window) {
	this.base.removeChild (window.base);
};


suit.Window.prototype.invalidate = function() {
	if (this.widget && this.context) {
		this.context.clear ();
		this.widget.draw (this.context);
	}
};


suit.Window.prototype.move = function(x, y) {
	suit.ensure (x, "number");
	suit.ensure (y, "number");

	var base = this.base;

	if (x !== this.x) {
		base.style.left = x + "px";
		this.x = x;
	}

	if (y !== this.y) {
		base.style.top = y + "px";
		this.y = y;
	}
};


suit.Window.prototype.resize = function(width, height) {
	suit.ensure (width, "number");
	suit.ensure (height, "number");

	var base;
	var canvas;
	var invalidate;

	base = this.base;
	canvas = this.canvas;
	invalidate = false;

	if (width !== this.width) {
		base.style.width = width + "px";
		if (canvas) {
			canvas.width = width;
			invalidate = true;
		}
		this.width = width;
	}

	if (height !== this.height) {
		base.style.height = height + "px";
		if (canvas) {
			canvas.height = height;
			invalidate = true;
		}
		this.height = height;
	}
	
	if (invalidate) this.invalidate ();
};

suit.Window.prototype.move_resize = function(x, y, w, h) {

	if (arguments.length === 1) {
		suit.ensure (x, suit.Allocation);
		h = x.height;
		w = x.width;
		y = x.y;
		x = x.x;
	}

	this.move(x, y);
	this.resize(w, h);
};


suit.Window.prototype.append_to = function(element) {
	element.appendChild(this.base);
};

suit.TextLayout = function SUITTextLayout() {
	suit.Object.call(this);
	
	/* This stores key/value pairs where the key is the width of a rendered
	   layout and the value is the number of lines the layout will take. */
	this.wrapped_length_cache = [];
	
	this.em_width = this.text_width("M");
};

suit.TextLayout.canvas_context = (function() {
	var c = document.createElement('canvas');
	return c.getContext('2d');
})();

suit.TextLayout.inherit (suit.Object);

// Default instance variables
suit.TextLayout.prototype.name = "TextLayout";
suit.TextLayout.prototype.text = "";
suit.TextLayout.prototype.text_wrapped = [""];
suit.TextLayout.prototype.text_split = [""];
suit.TextLayout.prototype.font_name = "sans-serif";
suit.TextLayout.prototype.font_size = 14;
suit.TextLayout.prototype.line_height = null;
suit.TextLayout.prototype.align = "left";
suit.TextLayout.prototype.width = null; // Infinite
suit.TextLayout.prototype.calculated = true;


suit.TextLayout.prototype.text_width = function(string) {
	suit.ensure(string, "string");

	suit.TextLayout.canvas_context.font = this.get_css_font_string();
	return suit.TextLayout.canvas_context.measureText(string).width;
};

// This invalidates the TextLayout meaning the layout needs to be re-calculated.
// It also clears the wrapped_length_cache as this is no longer valid.
suit.TextLayout.prototype.invalidate = function() {
	this.calculated = false;
	this.wrapped_length_cache = [];
	return this;
};

suit.TextLayout.prototype.set_text = function (text) {
	suit.ensure(text, "string");
	
	if (this.text !== text) {
		this.text = text;
		this.text_split = text.split("\n");
		this.invalidate();
		this.emit('resize');
	}
	return this;
};

suit.TextLayout.prototype.set_font = function (font_name, font_size) {
	suit.ensure(font_name, ["string", "undefined"]);
	suit.ensure(font_size, ["number", "undefined"]);
	
	if (font_name) {
		this.font_name = Array.isArray(font_name) ?
			"\""+font_name.join("\", \"")+"\"":
			"\""+font_name+"\"";
	}
	if (font_size) {
		this.font_size = font_size;
	}
	this.invalidate();
	this.em_width = this.text_width("M");
	this.emit('resize');
	return this;
};

suit.TextLayout.prototype.set_line_height = function (line_height) {
	suit.ensure(line_height, "number");
	
	this.line_height = line_height;
	this.emit('resize');
	return this;
};

suit.TextLayout.prototype.set_align = function (align) {
	suit.ensure(align, "string");
	
	this.align = align;
	return this;
};

suit.TextLayout.prototype.set_width = function (width) {
	suit.ensure(width, "number");
	
	if (this.width !== width) {
		this.width = width;
		this.calculated = false;
	}
	return this;
};

suit.TextLayout.prototype.get_css_font_string = function() {
	return this.font_size + "px "+this.font_name;
};

suit.TextLayout.prototype.get_index_at_pos = function(x, y) {
	suit.ensure(x, "number");
	suit.ensure(y, "number");

	var line_size = this.get_line_size();
	var line_nums = this.text_wrapped.length;
	
	var line_n = (y / line_size) | 0;
	line_n = (line_n > line_nums ? line_nums : (line_n < 0 ? 0 : line_n));
	
	var line = this.text_wrapped[line_n];
	
	// TODO: Start with best guess and test on each side, 1 char at a time until found
	// TODO: Support align center and right
	var col_n = 0;
	if (x <= 0 || line.length === 0) { col_n = 0; }
	else if (x >= this.text_width(line)) { col_n = line.length; }
	else {
		for (var i = 0, len = line.length; i <= len; i++) {
			var wi = (i == 0) ? 0 : this.text_width(line.substring(0, i));
			wi += (this.text_width(line.charAt(i))/2) | 0;
			if (wi >= x) {
				col_n = i;
				break;
			}
		}
	}
	
	return [line_n, col_n, line.charAt(col_n)];
};

suit.TextLayout.prototype.recalculate_layout = function() {

	var text_wrapped;

	if (this.width) {
		text_wrapped = [];
		this.perform_text_wrap(this.text_split, this.width, function(line) {
			text_wrapped.push(line);
		});
	} else {
		text_wrapped = this.line_split;
	}
	
	this.calculated = true;
	this.text_wrapped = text_wrapped;
	return this;
};

suit.TextLayout.prototype.perform_text_wrap = function(line_split, width, callback) {
	suit.ensure(line_split, "object"); // Array/Array-like
	suit.ensure(width, "number");
	suit.ensure(callback, "function");
	
	for (var i = 0, len = line_split.length; i < len; i++) {
		var m;
		var line = line_split[i];
		var start_index = 0;
		var break_index = 0;
		var last_break_index = 0;
		
		/* The regex is a |-seperated list of two points:
		 * The first is a point (or char) before a possible break
		 * The second is a point (or char) after the possible break
		 */
		while (m = line.substr(last_break_index).match(/. |-[^ ]|.$/)) {
			break_index += m.index+1;
			
			var wrap_line = line.substring(start_index, break_index);
			if (start_index !== 0) wrap_line = wrap_line.replace(/^\s+/, "");
			
			if (this.text_width(wrap_line) > width) {
				callback.call(this, line.substring(start_index, last_break_index));
				start_index = last_break_index;
			}
			last_break_index = break_index;
		}
		callback.call(this, line.substring(start_index))//.replace(/^\s+/, ""));
	}
	return this;
};

suit.TextLayout.prototype.get_preferred_height = function() {
	return this.text_split.length * this.get_line_size() + 1;
};

suit.TextLayout.prototype.get_preferred_width = function() {
	var preferred_width = 0;

	for (var i = 0, len = this.text_split.length; i < len; i++) {
		preferred_width = Math.max(preferred_width, this.text_width(this.text_split[i]));
	}
	
	return preferred_width + 1 | 0;
};

suit.TextLayout.prototype.get_preferred_height_for_width = function(width) {
	suit.ensure(width, "number");
	
	var lines = 0, height = 0;
	// Save some time if the width is already set
	if (typeof this.wrapped_length_cache[width] === "undefined") {
		this.perform_text_wrap(this.text_split, width, function(line) {
			lines++;
		});
		this.wrapped_length_cache[width] = lines;
	} else {
		lines = this.wrapped_length_cache[width];
	}
	height = lines * this.get_line_size() + 1 | 0;
	return height;
};

suit.TextLayout.prototype.get_preferred_width_for_height = function(height) {
	suit.ensure(height, "number");
	
	return this.get_preferred_width();
};

suit.TextLayout.prototype.get_line_size = function() {
	return (this.line_height !== null) ? this.font_size * this.line_height : this.font_size;
};

suit.TextLayout.prototype.render = function(graphics, x, y) {
	suit.ensure(graphics, suit.Graphics);
	suit.ensure(x, "number");
	suit.ensure(y, "number");
	
	if (!this.calculated) this.recalculate_layout();
	
	graphics.context.save();
	graphics.context.font = this.get_css_font_string();
	graphics.context.textBaseline = "top";
	graphics.context.textAlign = this.align;
	
	var line_size = this.get_line_size();
	
	// Contrain rendered lines to clipping area
	var i = 0;
	var len, lines_n;
	len = lines_n = this.text_wrapped.length;

	/*
	var clip = graphics.get_clip();
	if (clip.y > y) {
		i = (((clip.y - y)/line_size) | 0);
		i = i < 0 ? 0 : i;
	}
	if (clip.height) {
		len = i + ((clip.height/line_size) | 0) + 2;
		len = len > lines_n ? lines_n : len;
	}//*/
	var text;
	
	/*
	 * TODO: Render tab characters
	 */
	for (;i < len; i++) {
		text = this.text_wrapped[i].replace(/^\s+/, "");
		/*// TODO: Do tab calculations in word-wrapping code
		var firsttab = this.text_wrapped[i].match(/^\t+/);
		if (firsttab) {
			firsttab = firsttab[0].length * this.em_width * 4;
		}*/
		graphics.context.fillText(text, x,
			(y + i * line_size + (line_size/2-this.font_size/2)) | 0 );
	};
	
	graphics.context.restore();
	return this;
};

suit.Graphics = function SUITGraphics(context) {
	this.context = context;
	this.clip = [];

	context.mozImageSmoothingEnabled = true;
}

suit.Graphics.prototype.rect = function(x, y, w, h, stroke, fill) {
	var context = this.context;

	if (typeof stroke === "undefined" || stroke === null) stroke = false;
	if (typeof fill === "undefined" || fill === null) fill = true;

	if (fill) context.fillRect (x, y, w, h);
	if (stroke) context.strokeRect (x, y, w, h);
};

suit.Graphics.prototype.push_clip = function(x, y, w, h) {
	var context = this.context;

	context.save();
	context.beginPath();
	context.rect (x, y, w, h);
	context.clip();

	this.clip.push({x: x, y: y, width: w, height: h});
};

suit.Graphics.prototype.pop_clip = function() {
	this.context.restore();
	this.clip.pop();
};

suit.Graphics.prototype.get_clip = function() {
	return this.clip.length ? this.clip[this.clip.length-1] : null;
};

suit.Graphics.prototype.path = function(data, closepath, stroke, fill) {
	var context, delta;

	if (typeof closepath === "undefined" || closepath === null) closepath = false;
	if (typeof stroke === "undefined" || stroke === null) stroke = true;
	if (typeof fill === "undefined" || fill === null) fill = false;

	context = this.context;
	delta = context.lineWidth / 2 % 1;

	context.beginPath();
	for (var i = 0, len = data.length; i < len; i++) {
		if (!i) {
			context.moveTo((data[i][0]|0)+delta, (data[i][1]|0)+delta);
		} else {
			context.lineTo((data[i][0]|0)+delta, (data[i][1]|0)+delta);
		}
	}
	if (closepath) context.closePath();
	if (stroke) context.stroke();
	if (fill) context.fill();
};

suit.Graphics.prototype.set_shadow = function(offsetX, offsetY, blur, color) {
	var context;

	context = this.context;

	// Call with no arguments to remove shadow
	if (arguments.length) {
		if (typeof offsetX !== "undefined" && offsetX !== null) context.shadowOffsetX = offsetX;
		if (typeof offsetY !== "undefined" && offsetY !== null) context.shadowOffsetY = offsetY;
		if (typeof blur !== "undefined" && blur !== null) context.shadowBlur = blur;
		if (typeof color !== "undefined" && color !== null) context.shadowColor = color;
	} else {
		context.shadowOffsetX = 0;
		context.shadowOffsetY = 0;
		context.shadowBlur = 0;
		context.shadowColor = "transparent";
	}
};

suit.Graphics.prototype.create_linear_gradient = function(x, y, x2, y2, data) {
	var context, gradient;

	context = this.context;
	gradient = context.createLinearGradient(x, y, x2, y2);

	for (var i = 0, len = data.length; i < len; i++) {
		gradient.addColorStop (data[i][0], data[i][1]);
	}
	return gradient;
};

suit.Graphics.prototype.set_stroke_style = function(width, cap, linejoin, miterlimit) {
	var context;

	context = this.context;

	if (typeof width !== "undefined" && width !== null) context.lineWidth = width;
	// butt, round, square
	if (typeof cap !== "undefined" && cap !== null) context.lineCap = cap;
	// bevel, round, miter
	if (typeof linejoin !== "undefined" && linejoin !== null) context.lineJoin = linejoin;
	if (typeof miterlimit !== "undefined" && miterlimit !== null) context.miterLimit = miterlimit;
};

suit.Graphics.prototype.set_font_style = function(font, align, baseline) {
	var context;

	context = this.context;

	if (typeof font !== "undefined" && font !== null) context.font = font;
	// start, left, center, right, end
	if (typeof align !== "undefined" && align !== null) context.textAlign = align;
	// top, hanging, middle, alphabetic, ideographic, bottom
	if (typeof baseline !== "undefined" && baseline !== null) context.textBaseline = baseline;
};

suit.Graphics.prototype.set_fill_stroke = function(fill, stroke) {
	var context;

	context = this.context;

	if (fill) context.fillStyle = fill;
	if (stroke) context.strokeStyle = stroke;
};

suit.Graphics.prototype.clear = function() {
	var context;

	context = this.context;
	context.clearRect (0, 0, context.canvas.width, context.canvas.height);
};

suit.Graphics.prototype.translate = function(x, y) {
	this.context.translate (x | 0, y | 0);
};

suit.Graphics.prototype.save = function() {
	this.context.save();
};

suit.Graphics.prototype.restore = function() {
	this.context.restore();
};

suit.Error = function SUITError(msg) {
	this.message = msg;
};
suit.Error.prototype.name = "SUITError";

suit.assert = function(condition, error) {
	if (!condition) suit.error(error);
};

suit.log = function() {
	if (console.log.apply) {
		console.log.apply(console, arguments);
	} else {
		console.log(arguments[0]);
	}
};

suit.info = function() {
	if (console.info.apply) {
		console.info.apply(console, arguments);
	} else {
		console.info(arguments[0]);
	}
};

suit.warn = function() {
	if (console.warn.apply) {
		console.warn.apply(console, arguments);
	} else {
		console.warn(arguments[0]);
	}
};

suit.error = function() {
	if (console.error.apply) {
		console.error.apply(console, arguments);
	} else {
		console.error(arguments[0]);
	}
	throw new suit.Error(Array.prototype.join.call(arguments, " "));
};

suit.Widget = function SUITWidget() {
	suit.Object.call(this);
};

suit.Widget.inherit (suit.Object);

// Default instance variables
suit.Widget.prototype.name = "Widget";
suit.Widget.prototype.parent = null;
suit.Widget.prototype.screen = null;
suit.Widget.prototype.has_window = false;
suit.Widget.prototype.window = null;
suit.Widget.prototype.realized = false;
suit.Widget.prototype.event = null;
suit.Widget.prototype.event_mask = suit.Event.None;


suit.Widget.prototype.show = function() {
	if (!this.realized) {
		this.realize ();
	}
};
suit.Widget.prototype.show_all = suit.Widget.prototype.show;


suit.Widget.prototype.set_allocation = function(allocation) {
	var window;

	suit.ensure(allocation, suit.Allocation);
	this.allocation = allocation;

	window = this.window;

	if (window) {
		window.move_resize (allocation);
	}
};


suit.Widget.prototype.size_allocate = suit.Widget.prototype.set_allocation;

suit.Widget.prototype.get_allocation = function() {
	return this.allocation;
};


suit.Widget.prototype.get_has_window = function() {
	return this.has_window;
};


suit.Widget.prototype.set_has_window = function(has_window) {
	this.has_window = has_window;
};


suit.Widget.prototype.realize = function() {
	var window, allocation;

	if (this.has_window && !this.realized) {

		allocation = this.allocation;

		if (allocation) {
			this.size_allocate (allocation);
		}

		window = new suit.Window(this.get_parent_window(), this);
		window.move_resize (allocation);

		this.window = window;
	}

	this.realized = true;

};


suit.Widget.prototype.unrealize = function() {
	var window = this.window;

	if (this.has_window && window) {
		window.destroy ();
	}
};


suit.Widget.prototype.draw = function(context) {};
suit.Widget.prototype.get_request_mode = function() {};
suit.Widget.prototype.get_preferred_width = function() {};
suit.Widget.prototype.get_preferred_height = function() {};
suit.Widget.prototype.get_preferred_width_for_height = function() {};
suit.Widget.prototype.get_preferred_height_for_width = function() {};

suit.Widget.prototype.get_parent = function() {
	return this.parent;
};

suit.Widget.prototype.get_parent_window = function() {
	var parent = this.parent;
	if (!parent) return null;
	return parent.window || parent.get_parent_window();
};


suit.Widget.prototype.queue_redraw = function() {
	if (this.realized) {
		if (this.has_window) {
			this.window.invalidate ();
		} else if (this.parent) {
			this.parent.queue_redraw ();
		}
	}
};


suit.Widget.prototype.queue_resize = function() {
	if (this.parent) {
		this.parent.queue_resize();
	}
	if (this.window) {
		this.window.invalidate ();
	}
};


suit.Widget.prototype.get_screen = function() {
	if (this.screen) return this.screen;
	var widget = this;
	while (widget.parent) {
		if (widget.parent instanceof suit.Screen) return widget.parent;
		widget = widget.parent;
	}
	return null;
};


suit.Widget.prototype.event_mask_add = function(bits) {
	suit.ensure(bits, "number");
	
	this.event_mask |= bits;
	return this;
};


suit.Widget.prototype.event_mask_sub = function(bits) {
	suit.ensure(bits, "number");
	
	this.event_mask ^= bits;
	return this;
};


suit.Widget.prototype.lock = function() {
	if (suit.lock && suit.lock !== this) {
		suit.error("Events are already locked by another window.");
		return false;
	}
	suit.lock = this;
	return true;
};


suit.Widget.prototype.unlock = function() {
	suit.lock = null;
};

suit.Scrollbar = function Scrollbar(orientation) {
	suit.Widget.call(this);
	
	this.orientation = orientation || "vertical";
	
	this.style = {
		track_size: 16
	};
	
	this.scroll = 0;      // The amount of scroll on the child
	this.scroll_size = 0; // The size of the child widget
	
	suit.error("Why did you make a scrollbar?");
};

suit.Scrollbar.inherit (suit.Widget);

suit.Scrollbar.prototype.name = "Scrollbar";

suit.Scrollbar.prototype.draw = function(context) {
	suit.ensure(context, suit.Graphics);
	
	var a = this.allocation;
	
	context.set_stroke_style (4, "round");
	context.set_fill_stroke (null, "#333");
	
	if (this.orientation === "horizontal") {
		var y = a.height/2 | 0;
		var x = 6 + ((-this.scroll) / this.scroll_size * a.width);
		var w = a.width/this.scroll_size*(a.width-12) - 12;
		context.path([
			[x, y],
			[x+w, y]
		]);
	} else {
		var x = a.width/2 | 0;
		var y = 6 + ((-this.scroll) / this.scroll_size * a.height);
		var h = a.height/this.scroll_size*(a.height-12) - 12;
		context.path([
			[x, y],
			[x, y+h]
		]);
	}
	return this;
};


suit.Scrollbar.prototype.get_request_mode = function() {
	return SizeRequestMode.HEIGHT_FOR_WIDTH;
};
suit.Scrollbar.prototype.get_preferred_width = function() {
	var preferred = {
		minimum: 6,
		natural: 6
	}
	return preferred;
};
suit.Scrollbar.prototype.get_preferred_height = function() {
	var preferred = {
		minimum: 6,
		natural: 6
	};
	return preferred;
};
suit.Scrollbar.prototype.get_preferred_width_for_height = function(height) {
	suit.ensure(height, "number");
	var preferred = {
		minimum: 6,
		natural: 6
	};
	return preferred;
};
suit.Scrollbar.prototype.get_preferred_height_for_width = function(width) {
	suit.ensure(width, "number");
	var preferred = {
		minimum: 6,
		natural: 6
	};
	return preferred;
};

suit.Image = function SUITImage(filename) {
	suit.ensure(filename, "string");
	
	suit.Widget.call(this);
	this.filename = filename;
	
	var imageobj = document.createElement("img");
	imageobj.src = filename;
	
	var self = this;
	imageobj.onload = function() {
		self.loaded = true;
		self.usedimage = this;
		self.queue_resize();
	};
};


suit.Image.broken_image = (function() {
	var img = new Image();
	img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAN8SURBVEiJtZXNa1xVGMZ/99xzP2YyY4pJNUFbQ40iZOXGjcuuhoK4k+7digSjbkQX4toJ+Be4E0FELHTtH6AgHZWxM8wkaTshk69Ocud+nfO6aO7NTBqhaekL7+Jc3vM893ne95zjiAjPM/TkwnGcAPCfETMVkaRciQgiQrvdXo3jeGiMkWfJOI6H7XZ7tcB1RATHcSpRFG0qpeastZOKnuiXJ21WSmGt3a1Wq1dEZFxYFHieN5em6RTo0/THGIPv+3NAAJQEjoiwtrZGq9W6MOhkrKyssL6+DuDAaZMdEaHValGv1x+zpvCzsE8pheM459a1Wq1C+RSBAtBaEwTB1EZjDG8Hwnt1l6s2BWBD+fwyMvyROLiuO0UwHo+ZwpxU4Hkevu+XBFmWcTPMuTHcgjvbDB2FweENMXyy+DK35l/lx1zjeV5J4HneuQoeI7DWspwecf3fv0hGRxyFId8sLnM3Fa4eHfLZ1oDr+w+5s7RCT1dQSl2MII5j3r3XI9s7ZEdpLo+O+fzSLt/Nv8bfvs/XScK3ewPeoc1vtQW01hhjGI1GGGNKAnWWIAiCsg8Lu0MGBj598Qp3Dehunw+32iykYzZqs2wZeOXgEBFBa43v+/i+XwzDFIGanPkoitje3mZ8HBPhEoUVvphdpGMUXv8+H+/dZ0mDQZGMEyYPZ9GLArtUYK0liiK63S6dToeDgwNa1qUejXnTyYmrM3x56SU6BvTmA1YHm1SPx7SsS5ZlxHFMHMckSXKuAscYQ7/fZ3d3lziOyfOcn4IqcZJxc6PPsmREYchXs5e5lwvOgx3i9FFNnuclQZqm5zfZGEOSJOUhEhG6lSrf+xU+GOzw0eiIw9oMKrfMWGGcG36YqdGtVAnyHGMMIkKaplMK9KRFaZqiVCEKrLX8Wp/lT0dx4/iY5YcRAL9rza3aC2zU6vjWkiSnt/P/EaiC/eR2nWpYN6zQ9Pxi/HBd91Ge7JmszbLs/CYDNBoNsiwjTdMysywrp6QALtSdV9toNJjELN6Da4PBoFOtVtFaP/E7cDZEhDzPiaKIhYWF10WkW1hke73ecGlpaf6pkM9Er9cbAhZOLRo0m83b/X5/33VdtNZorcurw/d9giAgDEPCMCQIgvK753llveu69Pv9/WazeRsYwIlFAI7jrADvA29NEF80LPAP8LOItKYInlf8BwLjX+eOMfEfAAAAAElFTkSuQmCC";
	return img;
})();

suit.Image.inherit (suit.Widget);

// Default instance variables
suit.Image.prototype.name = "Image";
suit.Image.prototype.loaded = false;
suit.Image.prototype.usedimage = suit.Image.broken_image;
suit.Image.prototype.align = "center";
suit.Image.prototype.valign = "middle";


suit.Image.prototype.draw = function(graphics) {
	suit.ensure(graphics, suit.Graphics);
	
	var middlex = 0;
	var middley = 0;
	switch (this.align) {
	case "center": middlex = this.allocation.width/2 - this.usedimage.width/2;
		break;
	case "right": middlex = this.allocation.width - this.usedimage.width;
		break;
	}
	switch (this.valign) {
	case "middle": middley = this.allocation.height/2 - this.usedimage.height/2;
		break;
	case "bottom": middley = this.allocation.height - this.usedimage.height;
		break;
	}
	graphics.context.drawImage(this.usedimage, middlex | 0, middley | 0);
	return this;
};

suit.Image.prototype.set_align = function(align) {
	suit.ensure(align, "string");
	
	this.align = align;
	this.queue_redraw();
	return this;
};

suit.Image.prototype.set_valign = function(valign) {
	suit.ensure(valign, "string");
	
	this.valign = valign;
	this.queue_redraw();
	return this;
};

suit.Image.prototype.get_request_mode = function() {
	return SizeRequestMode.HEIGHT_FOR_WIDTH; // TODO: Rotatable text labels
};

suit.Image.prototype.get_preferred_width = function() {
	var width = this.usedimage.width;
	return {
		minimum: width,
		natural: width
	};
};
suit.Image.prototype.get_preferred_height = function() {
	var height = this.usedimage.height;
	return {
		minimum: height,
		natural: height
	};
};
suit.Image.prototype.get_preferred_height_for_width = function(awidth) {
	var iheight = this.usedimage.height;
	var iwidth = this.usedimage.width;
	var height = awidth / iwidth * iheight;
	
	height = this.usedimage.height;
	return {
		minimum: height,
		natural: height
	};
};
suit.Image.prototype.get_preferred_width_for_height = function(aheight) {
	var iheight = this.usedimage.height;
	var iwidth = this.usedimage.width;
	var width = aheight / iheight * iwidth;
	
	width = this.usedimage.width;
	return {
		minimum: width,
		natural: width
	};
};

suit.Label = function SUITLabel(text) {
	var style;

	suit.Widget.call(this);

	this.set_has_window (true);

	this.window = new suit.Window (document.body, this, true);
	style = this.window.base.style;
	
	style.display = "none";
	style.whiteSpace = "pre-wrap";
	style.overflow = "visible";
	style.color = "white";

	this.update_properties ();

	this.cache_pref_width = null;
	this.cache_pref_height = null;
	this.cache_pref_wfh = [];
	this.cache_pref_hfw = [];

	if (text) this.set_text (text);
};

suit.Label.inherit (suit.Widget);

// Default instance variables
suit.Label.prototype.name = "Label";
suit.Label.prototype.updated = false;
suit.Label.prototype.align = "left";
suit.Label.prototype.valign = "top"; // top, middle, bottom
suit.Label.prototype.line_height = null;
suit.Label.prototype.selectable = true;

suit.Label.prototype.clear_cache = function() {
	this.cache_pref_width = null;
	this.cache_pref_height = null;
	this.cache_pref_wfh.length = 0;
	this.cache_pref_hfw.length = 0;
};

suit.Label.prototype.realize = function() {
	var window, base, parent, allocation;

	if (!this.realized) {

		allocation = this.allocation;

		if (allocation) {
			this.size_allocate (allocation);
		}

		window = this.window;
		window.reparent (this.get_parent_window ());
		window.base.style.display = "block";

		window.move_resize (allocation);
	}

	this.realized = true;

};


suit.Label.prototype.update_properties = function() {
	var base;

	base = this.window.base;
	base.style.textAlign = this.align;
	base.style.lineHeight = this.line_height ? this.line_height + "em" : "normal";

	if (this.selectable) {
		base.style.cursor = "auto";
	} else {
		base.style.cursor = "default";
		base.style.userSelect = "none";
		base.style.MozUserSelect = "none";
		base.style.KhtmlUserSelect = "none";
	}
};


suit.Label.prototype.set_text = function(text) {
	text = String(text);

	if (this.text !== text) {
		this.clear_cache ();
		this.set_element_text (this.window.base, text);
		this.text = text;
		this.queue_resize ();
	}
};

suit.Label.prototype.set_align = function(align) {
	suit.ensure(align, "string");
	
	if (this.align !== align) {
		this.align = align;
		this.update_properties ();
	}
};

suit.Label.prototype.set_valign = function(valign) {
	suit.ensure(valign, "string");
	
	if (this.valign !== valign) {
		this.valign = valign;
		this.update_properties ();
	}
};

suit.Label.prototype.set_line_height = function(line_height) {
	if (this.line_height !== line_height) {
		this.line_height = line_height;
		this.update_properties ();
		this.clear_cache ();
		this.queue_resize ();
	}
};

suit.Label.prototype.set_selectable = function(selectable) {
	suit.ensure(selectable, "boolean");

	if (this.selectable !== selectable) {
		this.selectable = selectable;
		this.update_properties ();
	}
};

suit.Label.prototype.set_element_text = function(element, text) {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
	element.appendChild(document.createTextNode(text));
};

suit.Label.prototype.get_request_mode = function() {
	return SizeRequestMode.HEIGHT_FOR_WIDTH; // TODO: Rotatable text labels
};

suit.Label.prototype.get_preferred_width = function() {
	var width, realized, ostyle, ow, oh;

	if (this.cache_pref_width !== null) {
		width = this.cache_pref_width;
	} else {

		realized = this.realized;
		ostyle = this.window.base.style;

		if (!realized) {
			ostyle.display = "block";
		} else {
			ow = ostyle.width;
			oh = ostyle.height;
		}

		ostyle.height = "auto";
		ostyle.width = "auto";

		width = this.cache_pref_width = this.window.base.clientWidth + 1;

		if (!realized) {
			ostyle.display = "none";
		} else {
			ostyle.width = ow;
			ostyle.height = oh;
		}
	}

	return {
		minimum: width,
		natural: width
	};
};

suit.Label.prototype.get_preferred_height = function() {
	var height, realized, ostyle, ow, oh;

	if (this.cache_pref_height !== null) {
		height = this.cache_pref_height;
	} else {

		realized = this.realized;
		ostyle = this.window.base.style;

		if (!realized) {
			ostyle.display = "block";
		} else {
			ow = ostyle.width;
			oh = ostyle.height;
		}

		ostyle.height = "auto";
		ostyle.width = "auto";

		height = this.cache_pref_height = this.window.base.clientHeight + 1;

		if (!realized) {
			ostyle.display = "none";
		} else {
			ostyle.width = ow;
			ostyle.height = oh;
		}
	}

	return {
		minimum: height,
		natural: height
	};
};



suit.Label.prototype.get_preferred_height_for_width = function(width) {
	var height, realized, ostyle, ow, oh;

	if (this.cache_pref_hfw[width] != null) {
		height = this.cache_pref_hfw[width];
	} else {

		realized = this.realized;
		ostyle = this.window.base.style;

		if (!realized) {
			ostyle.display = "block";
		} else {
			ow = ostyle.width;
			oh = ostyle.height;
		}

		ostyle.height = "auto";
		ostyle.width = width+"px";

		height = this.cache_pref_hfw[width] = this.window.base.clientHeight + 1;

		if (!realized) {
			ostyle.display = "none";
		} else {
			ostyle.width = ow;
			ostyle.height = oh;
		}
	}

	return {
		minimum: height,
		natural: height
	};
};


suit.Label.prototype.get_preferred_width_for_height = function(height) {
	var width, realized, ostyle, ow, oh;

	if (this.cache_pref_wfh[height] != null) {
		width = this.cache_pref_wfh[height];
	} else {

		realized = this.realized;
		ostyle = this.window.base.style;

		if (!realized) {
			ostyle.display = "block";
		} else {
			ow = ostyle.width;
			oh = ostyle.height;
		}

		ostyle.height = height+"px";
		ostyle.width = "auto";

		width = this.cache_pref_wfh[height] = this.window.base.clientWidth + 1;

		if (!realized) {
			ostyle.display = "none";
		} else {
			ostyle.width = ow;
			ostyle.height = oh;
		}
	}

	return {
		minimum: width,
		natural: width
	};
};

suit.Container = function SUITContainer() {
	suit.Widget.call(this);
	this.children = [];
	this.connect("add", function() {
		if (this.allocation) {
			this.size_allocate(this.allocation);
		}
	});

	// Containers need a window by default to align children
	this.set_has_window (true);
};

suit.Container.inherit (suit.Widget);

suit.Container.prototype.name = "Container";

suit.Container.prototype.show_all = function() {
	var children = this.children;
	var i = children.length;

	this.show ();
	while (i--) {
		children[i].show_all();
	}
};

suit.Container.prototype.index_of = function(widget) {
	suit.ensure(widget, suit.Widget);

	if( (index = this.children.indexOf(widget)) > -1 ) {
		return index;
	}
	return false;
};

suit.Container.prototype.add = function(widget) {
	suit.ensure(widget, suit.Widget);
	
	this.children.push(widget);
	widget.parent = this;
	widget.screen = this.get_screen();

	this.emit('add');
	return this;
};

suit.Container.prototype.remove = function(widget) {
	suit.ensure(widget, suit.Widget);
	
	var index;
	if (index = this.index_of(widget)) {
		this.children.splice(index, 1);
	}
	return this;
};

suit.Container.prototype.remove_all = function() {
	for (var i = 0, len = this.children.length; i < len; i++) {
		this.children[i].parent = null;
		this.children[i].screen = null;
	}
	this.children = [];
	return this;
};

suit.Container.prototype.replace = function(widget_or_index, new_widget) {
	suit.ensure(widget_or_index, [suit.Widget, "number"]);
	suit.ensure(new_widget, suit.Widget);
	
	var index;
	if (typeof widget_or_index === "number") {
		index = widget_or_index;
	} else {
		index = this.index_of(widget_or_index);
	}
	if (index >= this.children.length) {
		return this.add(new_widget);
	}
	new_widget.parent = this;
	new_widget.screen = this.get_screen();
	this.children[index] = new_widget;
	return this;
};

suit.Container.prototype.insert = function(index, new_widget) {
	suit.ensure(index, "number");
	suit.ensure(new_widget, suit.Widget);
	
	if (index >= this.children.length) {
		return this.add(new_widget);
	}
	new_widget.parent = this;
	new_widget.screen = this.get_screen();
	this.children.splice(index, 0, new_widget);
	return this;
};

suit.Container.prototype.get_child_with_coords = function(x, y) {
	suit.ensure(x, "number");
	suit.ensure(y, "number");
	
	if (!this.children.length) return false;
	
	var child;
	for (var i = 0, len = this.children.length; i < len; i++) {
		child = this.children[i];
		if (!child.allocation) continue;
		if (x >= child.allocation.x &&
			x <= child.allocation.x + child.allocation.width &&
			y >= child.allocation.y &&
			y <= child.allocation.y + child.allocation.height) {
				return child;
		}
	}
	return false;
};

suit.Container.prototype.draw = function(graphics) {
	var children, len;

	children = this.children;
	len = children.length;

	while (len--) {
		this.propagate_draw (children[len], graphics);
	}
};

suit.Container.prototype.propagate_draw = function(child, graphics) {
	var allocation;

	suit.ensure (child, suit.Widget);
	suit.ensure (graphics, suit.Graphics);

	suit.assert (child.get_parent () === this, "propogate_draw: argument is not child to container");

	if (child.get_has_window ()) {
		return;
	}

	allocation = child.get_allocation ();

	graphics.save ();
	graphics.translate (allocation.x, allocation.y);

	child.draw (graphics);

	graphics.restore ();
};

suit.Bin = function SUITBin() {
	suit.Container.call(this);
};

suit.Bin.inherit (suit.Container);

suit.Bin.prototype.name = "Bin";
suit.Bin.prototype.child = null;

suit.Bin.prototype.set_child = function(widget) {
	suit.ensure(widget, suit.Widget);

	if (!this.child) {
		this.child = widget;
		suit.Container.prototype.add.call(this, widget);
	} else {
		suit.error("#%s already has child widget #%s.", this.name, this.child.name);
	}
	return this;
};

suit.Bin.prototype.get_child = function() {
	if (this.child) return this.child;
	return this;
};

suit.Bin.prototype.clear_child = function() {
	this.child = null;
	this.remove_all();
	return this;
};

suit.Bin.prototype.add = function() {
	suit.error("#%s is a Bin widget and can only hold one child, use set_child to add a child.", this.name);
	return this;
};

suit.Bin.prototype.remove = function() {
	suit.error("#%s is a Bin widget; use clear_child to remove its child.", this.name);
	return this;
};

suit.Bin.prototype.get_request_mode = function() {
	if (this.child) {
		return this.child.get_request_mode ();
	}
	return SizeRequestMode.HEIGHT_FOR_WIDTH;
};
suit.Bin.prototype.get_preferred_width = function() {
	var padding = this.style ? this.style.padding_left + this.style.padding_right : 0;
	var preferred = {
		minimum: padding,
		natural: padding
	};
	
	if (this.child) {
		var childpref = this.child.get_preferred_width();
		preferred.minimum += childpref.minimum;
		preferred.natural += childpref.natural;
	}
	return preferred;
};
suit.Bin.prototype.get_preferred_height = function() {
	var padding = this.style ? this.style.padding_top + this.style.padding_bottom : 0;
	var preferred = {
		minimum: padding,
		natural: padding
	};
	
	if (this.child) {
		var childpref = this.child.get_preferred_height();
		preferred.minimum += childpref.minimum;
		preferred.natural += childpref.natural;
	}
	return preferred;
};
suit.Bin.prototype.get_preferred_width_for_height = function(height) {
	suit.ensure(height, "number");
	
	var padding = this.style ? this.style.padding_left + this.style.padding_right : 0;
	var preferred = {
		minimum: padding,
		natural: padding
	};
	
	if (this.child) {
		var childpref = this.child.get_preferred_width_for_height(height);
		preferred.minimum += childpref.minimum;
		preferred.natural += childpref.natural;
	}
	return preferred;
};
suit.Bin.prototype.get_preferred_height_for_width = function(width) {
	suit.ensure(width, "number");
	
	var padding = this.style ? this.style.padding_top + this.style.padding_bottom : 0;
	var preferred = {
		minimum: padding,
		natural: padding
	};
	
	if (this.child) {
		var childpref = this.child.get_preferred_height_for_width(width);
		preferred.minimum += childpref.minimum;
		preferred.natural += childpref.natural;
	}
	return preferred;
};

suit.ProgressBar = function SUITProgressBar(text) {
	suit.Bin.call(this);
	
	if (text) {
		suit.ensure(text, "string");
		
		this.set_child(new suit.Label(text));
		this.child.set_align ("center");
		this.child.set_valign ("middle");
	}
	
	this.style = {
		padding_top: 6,
		padding_bottom: 6,
		padding_left: 8,
		padding_right: 8
	};
};

suit.ProgressBar.inherit (suit.Bin);

// Default instance variables
suit.ProgressBar.prototype.name = "ProgressBar";
suit.ProgressBar.prototype.orientation = "horizontal";
suit.ProgressBar.prototype.fraction = 0;

suit.ProgressBar.prototype.draw = function(context) {
	suit.ensure(context, suit.Graphics);
	
	var a = this.allocation;
	
	context.set_fill_stroke ("#191919");
	context.rect(a.x, a.y, a.width, a.height);
	
	context.set_fill_stroke ("#333333");
	
	if (this.orientation === "horizontal") {
		context.rect(a.x, a.y, a.width*this.fraction | 0, a.height);
	} else {
		context.rect(a.x, a.y, a.width, a.height*this.fraction | 0);
	}
	return this;
};

suit.ProgressBar.prototype.set_fraction = function(fraction) {
	suit.ensure(fraction, "number");
	
	this.fraction = fraction;
	this.queue_redraw();
	return this;
};

suit.ProgressBar.prototype.get_fraction = function() {
	return this.fraction;
};

suit.Scroller = function SUITScroller(child) {
	suit.Bin.call(this);
	
	this.scrollX = 0; // Distance from left of child to left of scroller. <= 0
	this.scrollY = 0; // Distance from top of child to top of scroller. <= 0
	
	this.dragging = false;
	this.startDragX = null;
	this.startDragY = null;
	
	this.policyX = "never"; // "never", "always"
	this.policyY = "always";
	
	if (child) {
		suit.ensure(child, suit.Widget);
		this.set_child(child);
	}

	this.style = {
		padding_top: 5,
		padding_bottom: 5,
		padding_left: 8,
		padding_right: 8
	};
	
	this.event_mask =
		/*suit.Event.ButtonPress | suit.Event.ButtonRelease | */suit.Event.Scroll;
};
suit.Scroller.inherit (suit.Bin);

suit.Scroller.prototype.name = "Scroller";

suit.Scroller.prototype.draw = function(graphics) {
	suit.ensure(graphics, suit.Graphics);
	
	var a = this.allocation;
	
	//graphics.set_fill_stroke ("#000");
	//graphics.rect(0, 0, a.width, a.height);
		
	if (this.child) {
		this.propagate_draw (this.child, graphics);
		this.draw_scrollbars (graphics);
	}
	return this;
};

suit.Scroller.prototype.draw_scrollbars = function(graphics) {
	suit.ensure(graphics, suit.Graphics);
	
	var a = this.allocation;
	var ca = this.child.get_allocation();
	
	graphics.set_stroke_style (4, "round");
	graphics.set_fill_stroke (null, "#333");
	
	if (this.policyY === "always") {
		var x = a.width - 5.5;
		var y = 6 + ((-this.scrollY) / ca.height * a.height);
		var h = a.height/ca.height*(a.height-12) - 12;
		graphics.path([
			[x, y],
			[x, y+h]
		]);
	}
	
	if (this.policyX === "always") {
		var y = a.height - 5.5;
		var x = 6 + ((-this.scrollX) / ca.width * a.width);
		var w = a.width/ca.width*(a.width-12) - 12;
		graphics.path([
			[x, y],
			[x+w, y]
		]);
	}
}

suit.Scroller.prototype.size_allocate = function(allocation) {
	suit.ensure(allocation, suit.Allocation);
	
	suit.Widget.prototype.size_allocate.call(this, allocation);
	
	var cw, ch;
	if (this.child) {
		if (this.policyX === "never" && this.policyY === "always") {
			cw = allocation.width - this.style.padding_left - this.style.padding_right - 1;
			ch = this.child.get_preferred_height_for_width(cw).natural;
		} else if (this.policyX === "never" && this.policyY === "never") {
			cw = allocation.width - this.style.padding_left - this.style.padding_right - 1;
			ch = allocation.height - this.style.padding_top - this.style.padding_bottom - 1;
		} else if (this.policyX === "always" && this.policyY === "always") {
			cw = this.child.get_preferred_width().natural;
			ch = this.child.get_preferred_height().natural;
		} else if (this.policyX === "always" && this.policyY === "never") {
			ch = allocation.height - this.style.padding_top - this.style.padding_bottom - 1;
			cw = this.child.get_preferred_width_for_height(ch).natural;
		}
		this.child.size_allocate(new suit.Allocation(0, 0, cw, ch));
		this.update_scroll_position();
	}
	return this;
};

suit.Scroller.prototype.update_scroll_position = function() {
	if (this.child) {
		var ca = this.child.get_allocation();
		var a = this.get_allocation();
		
		var max_scrollX = a.width - ca.width - this.style.padding_left - this.style.padding_right;
		var max_scrollY = a.height - ca.height - this.style.padding_bottom - this.style.padding_top;
		
		this.scrollX = this.scrollX > 0 ? 0 :
			(this.scrollX < max_scrollX ? max_scrollX : this.scrollX);
		this.scrollY = this.scrollY > 0 ? 0 :
			(this.scrollY < max_scrollY ? max_scrollY : this.scrollY);
		
		if (this.policyX === "never") this.scrollX = 0;
		if (this.policyY === "never") this.scrollY = 0;
		
		ca.x = this.style.padding_left + this.scrollX;
		ca.y = this.style.padding_top + this.scrollY;
		
		this.child.set_allocation(ca); // Use set_allocation here because we don't need to recalculate layout.
		this.queue_redraw();
	}
	return this;
};

suit.Scroller.prototype.set_policy = function(horizontal, vertical) {
	suit.ensure(horizontal, ["string", "undefined"]);
	suit.ensure(vertical, ["string", "undefined"]);
	
	this.policyX = horizontal || "never";
	this.policyY = vertical || "always";
	return this;
};

suit.Scroller.prototype.event = function(event) {
	switch (event.type) {
	case suit.Event.Scroll:
		this.on_event_scroll(event);
		break;
	case suit.Event.ButtonPress:
	case suit.Event.ButtonRelease:
		this.on_event_button(event);
		break;
	case suit.Event.Motion:
		this.on_event_motion(event);
		break;
	default:
		suit.log("Unknown event "+event.type);
	}
	return true;
};

suit.Scroller.prototype.on_event_scroll = function(e) {
	if (e.deltaY && this.policyY === "always") {
		this.scrollY += e.deltaY;
		this.update_scroll_position();
	}
	if (e.deltaX && this.policyX === "always") {
		this.scrollX += e.deltaX;
		this.update_scroll_position();
	}
};

suit.Scroller.prototype.on_event_button = function(e) {
	switch (e.type) {
	case suit.Event.ButtonPress:
		this.startDragX = e.x;
		this.startDragY = e.y;
		this.dragging = true;
		this.event_mask_add (suit.Event.Motion);
		this.lock();
		break;
	case suit.Event.ButtonRelease:
		if (this.dragging) {
			this.dragging = false;
			this.event_mask_sub (suit.Event.Motion);
			this.unlock();
		}
	}
};

suit.Scroller.prototype.on_event_motion = function(e) {

	if (this.dragging) {
		if (this.policyY === "always") {
			this.scrollY -= this.startDragY - e.y;
			this.startDragY = e.y;
		}
		if (this.policyX === "always") {
			this.scrollX -= this.startDragX - e.x;
			this.startDragX = e.x;
		}
		this.update_scroll_position();
	}
};

suit.Scroller.prototype.get_request_mode = function() {
	if (this.child) {
		return this.child.get_request_mode ();
	}
	return SizeRequestMode.HEIGHT_FOR_WIDTH;
};
suit.Scroller.prototype.get_preferred_width = function() {
	var preferred = new RequestedSize(1, 1);
	if (this.child) {
		preferred = this.child.get_preferred_width();
	}
	return preferred;
};
suit.Scroller.prototype.get_preferred_height = function() {
	var preferred = new suit.RequestedSize(1, 1);
	if (this.child) {
		preferred = this.child.get_preferred_height();
	}
	return preferred;
};
suit.Scroller.prototype.get_preferred_width_for_height = function(height) {
	suit.ensure(height, "number");
	
	var preferred = new suit.RequestedSize(1, 1);
	if (this.child) {
		preferred = this.child.get_preferred_width_for_height();
	}
	return preferred;
};
suit.Scroller.prototype.get_preferred_height_for_width = function(width) {
	suit.ensure(width, "number");
	
	var preferred = new suit.RequestedSize(1, 1);
	if (this.child) {
		preferred = this.child.get_preferred_height_for_width(width);
	}
	return preferred;
};

suit.Button = function SUITButton(text) {
	var label;

	suit.Bin.call(this);
	
	if (text) {
		suit.ensure(text, "string");
		
		label = new suit.Label(text);
		label.set_selectable (false);
		label.set_align ("center");
		label.set_valign ("middle");

		this.set_child (label);
	}
	
	this.style = {
		padding_top: 6,
		padding_bottom: 6,
		padding_left: 8,
		padding_right: 8
	};
};
suit.Button.inherit (suit.Bin);

// Default instance variables
suit.Button.prototype.name = "Button";
suit.Button.prototype.pressed = false;
suit.Button.prototype.event_mask = suit.Event.ButtonPress;

suit.Button.prototype.draw = function(graphics) {
	suit.ensure(graphics, suit.Graphics);
	
	var a = this.allocation;

	// TODO: Move this into a theme class
	/*context.set_shadow (0, 0, 5, "#000");
	context.rect(a.x, a.y, a.width, a.height);
		// Safari can't do shadows on shapes with gradients I guess
	context.set_shadow();*/

	var stops;
	if (!this.pressed) {
		stops = [
			[0, "#3f3f3f"],
			[1, "#2e2e2e"]
		];
	} else {
		stops = [
			[0, "#2e2e2e"],
			[1, "#3f3f3f"]
		];
	}

	graphics.set_fill_stroke (
		graphics.create_linear_gradient (0, 0, 0, a.height, stops),
		"#575757");
	graphics.rect(0, 0, a.width, a.height);
	
	graphics.set_stroke_style (1, "butt", "miter");
	graphics.path([
		[0,           a.height - 1],
		[0,           0],
		[a.width - 1, 0],
		[a.width - 1, a.height - 1]
	]);

	graphics.set_fill_stroke ("#ffffff", "#0b0b0b");
	graphics.path([
		[a.width - 1, a.height - 1],
		[0,           a.height - 1]
	]);

	var child;

	child = this.child;

	if (child) {
		this.propagate_draw (child, graphics);
	}
};

suit.Button.prototype.size_allocate = function(allocation) {
	suit.Widget.prototype.size_allocate.call(this, allocation);
	if (this.child) {
		this.child.size_allocate(new suit.Allocation(
			this.style.padding_left,
			this.style.padding_top + this.pressed,
			allocation.width - this.style.padding_left - this.style.padding_right - 1,
			allocation.height - this.style.padding_top - this.style.padding_bottom - 1
		));
	}
	return this;
};

suit.Button.prototype.event = function(e) {
	switch (e.type) {
	case suit.Event.ButtonPress:
		this.pressed = true;
		this.event_mask_add(suit.Event.ButtonRelease);
		this.lock();
		this.size_allocate(this.allocation);
		this.queue_redraw();
		break;
	case suit.Event.ButtonRelease:
		if (this.pressed) {
			this.event_mask_sub(suit.Event.ButtonRelease);
			this.emit("activate");
			this.pressed = false;
			this.unlock();
			this.size_allocate(this.allocation);
			this.queue_redraw();
		}
	}
};

suit.Screen = function SUITScreen(root) {
	suit.Bin.call(this);
	this.root = root;
};

suit.Screen.inherit (suit.Bin);

suit.Screen.prototype.name = "Screen";
suit.Screen.prototype.root = null;

suit.Screen.prototype.draw = function(graphics) {
	var a = this.allocation;
	
	graphics.save();
	graphics.set_fill_stroke ("#191919");
	graphics.rect (0, 0, a.width, a.height);
	if (this.child) {
		this.propagate_draw (this.child, graphics);
	}
	graphics.restore();
};

suit.Screen.prototype.queue_resize = function() {
	var allocation;

	allocation = this.allocation;

	if (allocation) {
		this.size_allocate (allocation);
	}
};

suit.Screen.prototype.size_allocate = function(a) {
	suit.ensure(a, suit.Allocation);
	
	suit.Widget.prototype.size_allocate.call(this, a);

	if (this.child) {
		this.child.size_allocate (new suit.Allocation(10, 10, a.width - 20, a.height - 20));
	}
};

suit.Screen.prototype.get_parent_window = function() {
	return this.root;
};


suit.Packer = function SUITPacker(orientation) {
	suit.ensure(orientation, "string");
	suit.Container.call(this);

	this.orientation = orientation || "horizontal"; // "horizontal" or "vertical"
	this.style = {
		padding_top: 0,
		padding_bottom: 0,
		padding_left: 0,
		padding_right: 0
	};
};
suit.Packer.inherit (suit.Container);

// Default instance variables
suit.Packer.prototype.name = "Packer";
suit.Packer.prototype.align = "start"; // "start", "end" or "middle"
suit.Packer.prototype.spacing = 20;

suit.Packer.prototype.set_spacing = function(spacing) {
	suit.ensure(spacing, "number");
	this.spacing = spacing;
	if (this.allocation) this.size_allocate (this.allocation);
	return this;
};

suit.Packer.prototype.get_spacing = function() {
	return this.spacing;
};

suit.Packer.prototype.size_allocate = function(allocation) {
	suit.ensure(allocation, suit.Allocation);
	suit.Widget.prototype.size_allocate.call(this, allocation);
	
	var majorsize, minorsize;
	if (this.orientation === "horizontal") {
		majorsize = (this.orientation === "horizontal") ?
			allocation.width : allocation.height;
		minorsize = (this.orientation === "horizontal") ?
			allocation.height : allocation.width;
	} else {
		majorsize = (this.orientation === "horizontal") ?
			allocation.height : allocation.width;
		minorsize = (this.orientation === "horizontal") ?
			allocation.width : allocation.height;
	}
	
	var childsize = 0;
	var childsize_parts = [];
	
	for (var i = 0, len = this.children.length; i < len; i++) {
		var child = this.children[i];
		var majchild = (this.orientation === "horizontal") ?
			child.get_preferred_width_for_height(minorsize).natural :
			child.get_preferred_height_for_width(majorsize).natural

		childsize += majchild;
		if (i !== 0) { childsize += this.spacing; }
		childsize_parts.push(majchild);
	}
	
	/*if (childsize > majorsize) {
		for (var i = 0, len = childsize_parts.length; i < len; i++) {
			childsize_parts[i] *= (majorsize/childsize);
		}
	}*/
	
	var majpos = 0;
	
	for (var i = 0, len = this.children.length; i < len; i++) {
		var child = this.children[i];
		var ca;
		if (i !== 0) { majpos += this.spacing; }
		if (this.orientation === "horizontal") {
			ca = new suit.Allocation(
				majpos, 0, childsize_parts[i], allocation.height);
		} else {
			ca = new suit.Allocation(
				0, majpos, allocation.width, childsize_parts[i]);
		}
		child.size_allocate(ca);
		majpos += childsize_parts[i];
	}
	return this;
};

suit.Packer.prototype.get_request_mode = function() {
	return SizeRequestMode.HEIGHT_FOR_WIDTH;
};

suit.Packer.prototype.get_preferred_width = function() {
	var minimum = 0;
	var natural = 0;
	
	for (var i = 0, len = this.children.length; i < len; i++) {
		var child = this.children[i];
		var size = child.get_preferred_width();
		minimum += size.minimum;
		natural += size.natural;
	}
	
	minimum += this.spacing * (len-1);
	natural += this.spacing * (len-1);
	
	return {
		minimum: minimum,
		natural: natural
	};
};

suit.Packer.prototype.get_preferred_height = function() {
	var minimum = 0;
	var natural = 0;
	
	for (var i = 0, len = this.children.length; i < len; i++) {
		var child = this.children[i];
		var size = child.get_preferred_height();
		minimum += size.minimum;
		natural += size.natural;
	}
	
	minimum += this.spacing * (len-1);
	natural += this.spacing * (len-1);
	
	return {
		minimum: minimum,
		natural: natural
	};
};

suit.Packer.prototype.get_preferred_width_for_height = function(height) {
	suit.ensure(height, "number");
	
	var minimum = 0;
	var natural = 0;
	
	if (this.orientation === "horizontal") {
		for (var i = 0, len = this.children.length; i < len; i++) {
			var child = this.children[i];
			var size = child.get_preferred_width_for_height(height);
			minimum += size.minimum;
			natural += size.natural;
		}
	
		minimum += this.spacing * (len-1);
		natural += this.spacing * (len-1);
	} else {
		for (var i = 0, len = this.children.length; i < len; i++) {
			var child = this.children[i];
			var size = child.get_preferred_width_for_height(height);
			minimum = (size.minimum > minimum) ? size.minimum : minimum;
			natural = (size.natural > natural) ? size.natural : natural;
		}
	}
	
	return {
		minimum: minimum,
		natural: natural
	};
};

suit.Packer.prototype.get_preferred_height_for_width = function(width) {
	suit.ensure(width, "number");
	
	var minimum = 0;
	var natural = 0;
	
	if (this.orientation === "horizontal") {
		for (var i = 0, len = this.children.length; i < len; i++) {
			var child = this.children[i];
			var size = child.get_preferred_height_for_width(width);
			minimum = (size.minimum > minimum) ? size.minimum : minimum;
			natural = (size.natural > natural) ? size.natural : natural;
		}
	} else {
		for (var i = 0, len = this.children.length; i < len; i++) {
			var child = this.children[i];
			var size = child.get_preferred_height_for_width(width);
			minimum += size.minimum;
			natural += size.natural;
		}
	
		minimum += this.spacing * (len-1);
		natural += this.spacing * (len-1);
	}
	
	return {
		minimum: minimum,
		natural: natural
	};
};
