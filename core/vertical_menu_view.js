/* jslint node: true */
'use strict';

var MenuView		= require('./menu_view.js').MenuView;
var ansi			= require('./ansi_term.js');
var strUtil			= require('./string_util.js');
var miscUtil		= require('./misc_util.js');

var util			= require('util');
var assert			= require('assert');
var _				= require('lodash');

exports.VerticalMenuView		= VerticalMenuView;

function VerticalMenuView(options) {
	options.cursor	= options.cursor || 'hide';
	options.justify = options.justify || 'right';

	MenuView.call(this, options);

	var self = this;

	this.performAutoScale = function() {
		if(this.autoScale.height) {
			this.dimens.height = (self.items.length * (self.itemSpacing + 1)) - (self.itemSpacing);
			this.dimens.height = Math.min(this.dimens.height, self.client.term.termHeight - self.position.x);
		}

		if(this.autoScale.width) {
			var l = 0;
			self.items.forEach(function item(i) {
				if(i.text.length > l) {
					l = Math.min(i.text.length, self.client.term.termWidth - self.position.y);
				}
			});
			self.dimens.width = l + 1;
		}
	};

	this.performAutoScale();

	this.drawItem = function(index) {
		var item = self.items[index];
		if(!item) {
			return;
		}

		self.client.term.write(ansi.goto(item.xPosition, self.position.y));
		self.client.term.write(index === self.focusedItemIndex ? self.getFocusSGR() : self.getSGR());

		var text = strUtil.stylizeString(item.text, item.focused ? self.focusTextStyle : self.textStyle);

		self.client.term.write(
			strUtil.pad(text, this.dimens.width, this.fillChar, this.justify));
	};
}

util.inherits(VerticalMenuView, MenuView);

VerticalMenuView.prototype.redraw = function() {
	VerticalMenuView.super_.prototype.redraw.call(this);

	var x = this.position.x;
	for(var i = this.viewWindow.top; i <= this.viewWindow.bottom; ++i) {
		this.items[i].xPosition = x;
		x += this.itemSpacing + 1;
		this.items[i].focused = this.focusedItemIndex === i;
		this.drawItem(i);
	}
};

VerticalMenuView.prototype.setPosition = function(pos) {
	VerticalMenuView.super_.prototype.setPosition.call(this, pos);

	this.positionCacheExpired = true;
};

VerticalMenuView.prototype.setFocus = function(focused) {
	VerticalMenuView.super_.prototype.setFocus.call(this, focused);

	this.redraw();
};

VerticalMenuView.prototype.onSpecialKeyPress = function(keyName) {

	var prevFocusedItemIndex = this.focusedItemIndex;

	if(this.isSpecialKeyMapped('up', keyName)) {		
		if(0 === this.focusedItemIndex) {
			this.focusedItemIndex = this.items.length - 1;
			
			this.viewWindow = {
				top		: this.items.length - this.maxVisibleItems,
				bottom	: this.items.length - 1
			};
		} else {
			this.focusedItemIndex--;

			if(this.focusedItemIndex < this.viewWindow.top) {
				this.viewWindow.top--;
				this.viewWindow.bottom--;
			}
		}
	} else if(this.isSpecialKeyMapped('down', keyName)) {
		if(this.items.length - 1 === this.focusedItemIndex) {
			this.focusedItemIndex = 0;
			
			this.viewWindow = {
				top		: 0,
				bottom	: Math.min(this.focusedItemIndex + this.maxVisibleItems, this.items.length) - 1
			};
		} else {
			this.focusedItemIndex++;

			if(this.focusedItemIndex > this.viewWindow.bottom) {
				this.viewWindow.top++;
				this.viewWindow.bottom++;
			}
		}
	}

	if(prevFocusedItemIndex !== this.focusedItemIndex) {
		this.redraw();
	}

	VerticalMenuView.super_.prototype.onSpecialKeyPress.call(this, keyName);
};

VerticalMenuView.prototype.getData = function() {
	return this.focusedItemIndex;
};

VerticalMenuView.prototype.setItems = function(items) {
	VerticalMenuView.super_.prototype.setItems.call(this, items);

	this.performAutoScale();

	this.maxVisibleItems = Math.ceil(this.dimens.height / (this.itemSpacing + 1));

	this.viewWindow = {
		top		: this.focusedItemIndex,
		bottom	: Math.min(this.focusedItemIndex + this.maxVisibleItems, this.items.length) - 1
	};
};