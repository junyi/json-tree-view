(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Created by richard.livingston on 18/02/2017.
 */
'use strict';

var util = require('util'),
	EE = require('events').EventEmitter;


module.exports = JSONTreeView;
util.inherits(JSONTreeView, EE);


function JSONTreeView(name_, value_, parent_, isRoot_){
	var self = this;

	if (typeof isRoot_ === 'undefined' && arguments.length < 4) {
		isRoot_ = true;
	}

	EE.call(self);

	if(arguments.length < 2){
		value_ = name_;
		name_ = undefined;
	}

	var name, value, type, filterText = '', hidden = false, readonly = false,
		readonlyWhenFiltering = false, alwaysShowRoot = false,
		showCount = parent_ ? parent_.showCountOfObjectOrArray : true,
		includingRootName = true,
		domEventListeners = [], children = [], expanded = false,
		edittingName = false, edittingValue = false,
		nameEditable = true, valueEditable = true;

	var dom = {
		container : document.createElement('div'),
		collapseExpand : document.createElement('div'),
		name : document.createElement('div'),
		separator : document.createElement('div'),
		value : document.createElement('div'),
		spacing: document.createElement('div'),
		delete : document.createElement('div'),
		children : document.createElement('div'),
		insert : document.createElement('div')
	};


	Object.defineProperties(self, {

		dom : {
			value : dom.container,
			enumerable : true
		},

		isRoot: {
			get : function(){
				return isRoot_;
			}
		},

		parent: {
			get: function() {
				return parent_;
			}
		},

		children: {
			get: function() {
				var result = null;
				if (type === 'array') {
					result = children;
				}
				else if (type === 'object') {
					result = {};
					children.forEach(function(e) {
						result[e.name] = e;
					});
				}
				return result;
			}
		},

		readonly: {
			get: function() {
				return !!(readonly & 1);
			},
			set: function(ro) {
				readonly = setBit(readonly, 0, +ro);
				!!(readonly & 1) ? dom.container.classList.add('readonly')
						: dom.container.classList.remove('readonly');
				for (var i in children) {
					children[i].readonly = setBit(readonly, 0, +ro);
				}
			}
		},

		readonlyWhenFiltering: {
			get: function() {
				return readonlyWhenFiltering;
			},
			set: function(rowf) {
				readonly = setBit(readonly, 1, +rowf);
				readonlyWhenFiltering = rowf;
				(readonly && this.filterText) || !!(readonly & 1)
						? dom.container.classList.add('readonly')
								: dom.container.classList.remove('readonly');
				for (var i in children) {
					children[i].readonly = setBit(readonly, 1, +rowf);
					children[i].readonlyWhenFiltering = rowf;
				}
			}
		},

		hidden: {
			get: function() {
				return hidden;
			},
			set: function(h) {
				hidden = h;
				h ? dom.container.classList.add('hidden')
						: dom.container.classList.remove('hidden');
				if (!h) {
					parent_ && (parent_.hidden = h);
				}
			}
		},

		showCountOfObjectOrArray: {
			get: function() {
				return showCount;
			},
			set: function(show) {
				showCount = show;
				for (var i in children) {
					children[i].showCountOfObjectOrArray = show;
				}
				(this.type === 'object' || this.type === 'array') && this.updateCount();
			}
		},

		filterText: {
			get: function() {
				return filterText;
			},
			set: function(text) {
				filterText = text;
				if (text) {
					if (readonly > 0) {
						dom.container.classList.add('readonly');
					}
					var key = this.name + '';
					var value = this.value + '';
					if (key.indexOf(text) > -1 || value.indexOf(text) > -1) {
						this.hidden = false;
					} else {
						if (!this.alwaysShowRoot || !isRoot_) {
							this.hidden = true;
						}
					}
				} else {
					!this.readonly && dom.container.classList.remove('readonly');
					this.hidden = false;
				}
				for (var i in children) {
					children[i].filterText = text;
				}
			}
		},

		alwaysShowRoot: {
			get: function() {
				return alwaysShowRoot;
			},
			set: function(value) {
				if (isRoot_ && this.filterText) {
					this.hidden = !value;
				}
				alwaysShowRoot = value;
				for (var i in children) {
					children[i].alwaysShowRoot = value;
				}
			}
		},

		withRootName: {
			get: function() {
				return includingRootName;
			},
			set: function(value) {
				includingRootName = value;
			}
		},

		name : {
			get : function(){
				return name;
			},

			set : setName,
			enumerable : true
		},

		value : {
			get : function(){
				return value;
			},

			set : setValue,
			enumerable : true
		},

		type : {
			get : function(){
				return type;
			},

			enumerable : true
		},

		nameEditable : {
			get : function(){
				return nameEditable;
			},

			set : function(value){
				nameEditable = !!value;
			},

			enumerable : true
		},

		valueEditable : {
			get : function(){
				return valueEditable;
			},

			set : function(value){
				valueEditable = !!value;
			},

			enumerable : true
		},

		refresh : {
			value : refresh,
			enumerable : true
		},

		updateCount: {
			value: updateObjectChildCount,
			enumerable: true
		},

		collapse : {
			value : collapse,
			enumerable : true
		},

		expand : {
			value : expand,
			enumerable : true
		},

		destroy : {
			value : destroy,
			enumerable : true
		},

		editName : {
			value : editField.bind(null, 'name'),
			enumerable : true
		},

		editValue : {
			value : editField.bind(null, 'value'),
			enumerable : true
		}

	});


	Object.keys(dom).forEach(function(k){
		if (k === 'delete' && self.isRoot) {
			return;
		}

		var element = dom[k];

		if(k == 'container'){
			return;
		}

		element.className = k;
		if (['name', 'separator', 'value', 'spacing'].indexOf(k) > -1) {
			element.className += ' item';
		}
		dom.container.appendChild(element);
	});

	dom.container.className = 'jsonView';

	addDomEventListener(dom.collapseExpand, 'click', onCollapseExpandClick);
	addDomEventListener(dom.value, 'click', expand.bind(null, false));
	addDomEventListener(dom.name, 'click', expand.bind(null, false));

	addDomEventListener(dom.name, 'dblclick', editField.bind(null, 'name'));
	addDomEventListener(dom.name, 'click', itemClicked.bind(null, 'name'));
	addDomEventListener(dom.name, 'blur', editFieldStop.bind(null, 'name'));
	addDomEventListener(dom.name, 'keypress',
			editFieldKeyPressed.bind(null, 'name'));
	addDomEventListener(dom.name, 'keydown',
			editFieldTabPressed.bind(null, 'name'));

	addDomEventListener(dom.value, 'dblclick', editField.bind(null, 'value'));
	addDomEventListener(dom.value, 'click', itemClicked.bind(null, 'value'));
	addDomEventListener(dom.value, 'blur', editFieldStop.bind(null, 'value'));
	addDomEventListener(dom.value, 'keypress',
			editFieldKeyPressed.bind(null, 'value'));
	addDomEventListener(dom.value, 'keydown',
			editFieldTabPressed.bind(null, 'value'));
	addDomEventListener(dom.value, 'keydown', numericValueKeyDown);

	addDomEventListener(dom.insert, 'click', onInsertClick);
	addDomEventListener(dom.delete, 'click', onDeleteClick);

	setName(name_);
	setValue(value_);

	function setBit(n, i, b) {
		var j = 0;
		while ((n >> j << j)) {
			j++;
		}
		return i >= j
				? (n | +b << i )
						: (n >> (i + 1) << (i + 1)) | (n % (n >> i << i)) | (+b << i);
	}


	function squarebracketify(exp) {
		return typeof exp === 'string'
			? exp.replace(/\.([0-9]+)/g, '[$1]') : exp + '';
	}

	function refresh(noEmitting){
		var expandable = type == 'object' || type == 'array';

		children.forEach(function(child){
			child.refresh(true);
		});

		dom.collapseExpand.style.display = expandable ? '' : 'none';

		if(expanded && expandable){
			expand(false, noEmitting);
		}
		else{
			collapse(false, noEmitting);
		}
		!noEmitting && self.emit('refresh', self, self.name, self.value);
	}


	function collapse(recursive, noEmitting){
		if(recursive){
			children.forEach(function(child){
				child.collapse(true, true);
			});
		}

		expanded = false;

		dom.children.style.display = 'none';
		dom.collapseExpand.className = 'expand';
		dom.container.classList.add('collapsed');
		dom.container.classList.remove('expanded');
		!noEmitting && (type == 'object' || type == 'array')
			&& self.emit('collapse', self, self.name, self.value);
	}


	function expand(recursive, noEmitting){
		var keys;

		if(type == 'object'){
			keys = Object.keys(value);
		}
		else if(type == 'array'){
			keys = value.map(function(v, k){
				return k;
			});
		}
		else{
			keys = [];
		}

		// Remove children that no longer exist
		for(var i = children.length - 1; i >= 0; i --){
			var child = children[i];

			if(keys.indexOf(child.name) == -1){
				children.splice(i, 1);
				removeChild(child, noEmitting);
			}
		}

		if(type != 'object' && type != 'array'){
			return collapse();
		}

		keys.forEach(function(key){
			addChild(key, value[key]);
		});

		if(recursive){
			children.forEach(function(child){
				child.expand(true, true);
			});
		}

		expanded = true;
		dom.children.style.display = '';
		dom.collapseExpand.className = 'collapse';
		dom.container.classList.add('expanded');
		dom.container.classList.remove('collapsed');
		!noEmitting && (type == 'object' || type == 'array')
			&& self.emit('expand', self, self.name, self.value);
	}


	function destroy(){
		var child, event;

		while(event = domEventListeners.pop()){
			event.element.removeEventListener(event.name, event.fn);
		}

		while(child = children.pop()){
			removeChild(child, true);
		}
	}


	function setName(newName){
		var nameType = typeof newName,
			oldName = name;

		if(newName === name){
			return;
		}

		if(nameType != 'string' && nameType != 'number'){
			throw new Error('Name must be either string or number, ' + newName);
		}

		dom.name.innerText = newName;
		name = newName;
		self.emit('rename', self, name, oldName, newName, true);
	}


	function setValue(newValue){
		var oldValue = value,
			str, len;

		type = getType(newValue);

		switch(type){
			case 'null':
				str = 'null';
				break;
			case 'undefined':
				str = 'undefined';
				break;
			case 'object':
				len = Object.keys(newValue).length;
				str = showCount ? 'Object[' + len + ']' : (len < 1 ? '{}' : '');
				break;

			case 'array':
				len = newValue.length;
				str = showCount ? 'Array[' + len + ']' : (len < 1 ? '[]' : '');
				break;

			default:
				str = newValue;
				break;
		}

		dom.value.innerText = str;
		dom.value.className = 'value item ' + type;

		if(newValue === value){
			return;
		}

		value = newValue;

		if(type == 'array' || type == 'object'){
			// Cannot edit objects as string because the formatting is too messy
			// Would have to either pass as JSON and force user to wrap properties in quotes
			// Or first JSON stringify the input before passing, this could allow users to reference globals

			// Instead the user can modify individual properties, or just delete the object and start again
			valueEditable = false;

			if(type == 'array'){
				// Obviously cannot modify array keys
				nameEditable = false;
			}
		}

		self.emit('change', self, name, oldValue, newValue);
		refresh();
	}


	function updateObjectChildCount() {
		var str = '', len;
		if (type === 'object') {
			len = Object.keys(value).length;
			str = showCount ? 'Object[' + len + ']' : (len < 1 ? '{}' : '');
		}
		if (type === 'array') {
			len = value.length;
			str = showCount ? 'Array[' + len + ']' : (len < 1 ? '[]' : '');
		}
		dom.value.innerText = str;
	}


	function addChild(key, val, noEmitting){
		var child;

		for(var i = 0, len = children.length; i < len; i ++){
			if(children[i].name == key){
				child = children[i];
				break;
			}
		}

		if(child){
			child.value = val;
		}
		else{
			child = new JSONTreeView(key, val, self, false);
			child.on('rename', onChildRename);
			child.on('delete', onChildDelete);
			child.on('change', onChildChange);
			child.on('append', onChildAppend);
			child.on('click', onChildClick);
			child.on('expand', onChildExpand);
			child.on('collapse', onChildCollapse);
			child.on('refresh', onChildRefresh);
			children.push(child);
			if (!noEmitting) {
				child.emit('append', child, key, 'value', val, true);
			}
		}

		dom.children.appendChild(child.dom);

		return child;
	}


	function removeChild(child, noEmitting){
		if(child.dom.parentNode){
			dom.children.removeChild(child.dom);
		}

		if (!noEmitting && child && child.name !== '') {
			child.emit('delete', child, child.name, child.value, child.parent.type,
				true);
		}
		child.destroy();
		child.removeAllListeners();
	}


	function editField(field){
		if((readonly > 0 && filterText) || !!(readonly & 1)) {
			return;
		}
		if(field === 'value' && (type === 'object' || type === 'array')){
			return;
		}
		if(parent_ && parent_.type == 'array'){
			// Obviously cannot modify array keys
			nameEditable = false;
		}
		var editable = field == 'name' ? nameEditable : valueEditable,
			element = dom[field];

		if(!editable && (parent_ && parent_.type === 'array')){
			if (!parent_.inserting) {
				// throw new Error('Cannot edit an array index.');
				return;
			}
		}

		if(field == 'value' && type == 'string'){
			element.innerText = '"' + value + '"';
		}

		if(field == 'name'){
			edittingName = true;
		}

		if(field == 'value'){
			edittingValue = true;
		}

		element.classList.add('edit');
		element.setAttribute('contenteditable', true);
		element.focus();
		document.execCommand('selectAll', false, null);
	}


	function itemClicked(field) {
		self.emit('click', self,
			!self.withRootName && self.isRoot ? '' : self.name, self.value);
	}


	function editFieldStop(field){
		var element = dom[field];
		
		if(field == 'name'){
			if(!edittingName){
				return;
			}
			edittingName = false;
		}

		if(field == 'value'){
			if(!edittingValue){
				return;
			}
			edittingValue = false;
		}
		
		if(field == 'name'){
			var p = self.parent;
			var edittingNameText = element.innerText;
			if (p && p.type === 'object' && edittingNameText in p.value) {
				element.innerText = name;
				element.classList.remove('edit');
				element.removeAttribute('contenteditable');
				// throw new Error('Name exist, ' + edittingNameText);
			}
			else {
				setName.call(self, edittingNameText);
			}
		}
		else{
			var text = element.innerText;
			try{
				setValue(text === 'undefined' ? undefined : JSON.parse(text));
			}
			catch(err){
				setValue(text);
			}
		}

		element.classList.remove('edit');
		element.removeAttribute('contenteditable');
	}


	function editFieldKeyPressed(field, e){
		switch(e.key){
			case 'Escape':
			case 'Enter':
				editFieldStop(field);
				break;
		}
	}


	function editFieldTabPressed(field, e){
		if(e.key == 'Tab'){
			editFieldStop(field);

			if(field == 'name'){
				e.preventDefault();
				editField('value');
			}
			else{
				editFieldStop(field);
			}
		}
	}


	function numericValueKeyDown(e){
		var increment = 0, currentValue;

		if(type != 'number'){
			return;
		}

		switch(e.key){
			case 'ArrowDown':
			case 'Down':
				increment = -1;
				break;

			case 'ArrowUp':
			case 'Up':
				increment = 1;
				break;
		}

		if(e.shiftKey){
			increment *= 10;
		}

		if(e.ctrlKey || e.metaKey){
			increment /= 10;
		}

		if(increment){
			currentValue = parseFloat(dom.value.innerText);

			if(!isNaN(currentValue)){
				setValue(Number((currentValue + increment).toFixed(10)));
			}
		}
	}


	function getType(value){
		var type = typeof value;

		if(type == 'object'){
			if(value === null){
				return 'null';
			}

			if(Array.isArray(value)){
				return 'array';
			}
		}
		if (type === 'undefined') {
			return 'undefined';
		}

		return type;
	}


	function onCollapseExpandClick(){
		if(expanded){
			collapse();
		}
		else{
			expand();
		}
	}


	function onInsertClick(){
		var newName = type == 'array' ? value.length : undefined,
			child = addChild(newName, null, true);
		if (child.parent) {
			child.parent.inserting = true;
		}
		if(type == 'array'){
			value.push(null);
			child.editValue();
			child.emit('append', self, value.length - 1, 'value', null, true);
			if (child.parent) {
				child.parent.inserting = false;
			}
		}
		else{
			child.editName();
		}
	}


	function onDeleteClick(){
		self.emit('delete', self, self.name, self.value, self.parent.type, true);
	}


	function onChildRename(child, keyPath, oldName, newName, original){
		var allow = newName && type != 'array' && !(newName in value) && original;
		if(allow){
			value[newName] = child.value;
			delete value[oldName];
			if (self.inserting) {
				child.emit('append', child, newName, 'name', newName, true);
				self.inserting = false;
				return;
			}
		}
		else if(oldName === undefined){
			// A new node inserted via the UI
			original && removeChild(child);
		}
		else if (original){
			// Cannot rename array keys, or duplicate object key names
			child.name = oldName;
			return;
		}
		// value[keyPath] = newName;

		// child.once('rename', onChildRename);
		var newKeyPath = child === self || (!self.withRootName && self.isRoot)
			? keyPath
			: name + '.' + keyPath;
		if (oldName !== undefined) {
			self.emit('rename', child, squarebracketify(newKeyPath), oldName, newName,
				false);
		}
	}


	function onChildAppend(child, keyPath, nameOrValue, newValue, sender){
		var newKeyPath = !self.withRootName && self.isRoot
			? keyPath
			: name + '.' + keyPath;
		self.emit('append', child, squarebracketify(newKeyPath), nameOrValue,
			newValue, false);
		sender && updateObjectChildCount();
	}


	function onChildChange(child, keyPath, oldValue, newValue, recursed){
		if(!recursed){
			value[keyPath] = newValue;
		}

		var newKeyPath = !self.withRootName && self.isRoot
			? keyPath
			: name + '.' + keyPath;
		self.emit('change', child, squarebracketify(newKeyPath), oldValue, newValue,
			true);
	}


	function onChildDelete(child, keyPath, deletedValue, parentType, sender){
		var key = child.name;

		if(type == 'array'){
			if (key === keyPath) {
				value.splice(key, 1);
			}
		}
		else if (sender) {
			delete value[key];
		}

		var newKeyPath = !self.withRootName && self.isRoot
			? keyPath
			: name + '.' + keyPath;
		self.emit('delete', child, squarebracketify(newKeyPath), deletedValue,
			parentType, false);
		sender && updateObjectChildCount();
		refresh(true);
	}


	function onChildClick(child, keyPath, value) {
		var newKeyPath = !self.withRootName && self.isRoot
			? keyPath
			: name + '.' + keyPath;
		self.emit('click', child, squarebracketify(newKeyPath), value);
	}


	function onChildExpand(child, keyPath, value) {
		var newKeyPath = !self.withRootName && self.isRoot
			? keyPath
			: name + '.' + keyPath;
		self.emit('expand', child, squarebracketify(newKeyPath), value);
	}


	function onChildCollapse(child, keyPath, value) {
		var newKeyPath = !self.withRootName && self.isRoot
			? keyPath
			: name + '.' + keyPath;
		self.emit('collapse', child, squarebracketify(newKeyPath), value);
	}


	function onChildRefresh(child, keyPath, value) {
		var newKeyPath = !self.withRootName && self.isRoot
			? keyPath
			: name + '.' + keyPath;
		self.emit('refresh', child, squarebracketify(newKeyPath), value);
	}


	function addDomEventListener(element, name, fn){
		element.addEventListener(name, fn);
		domEventListeners.push({element : element, name : name, fn : fn});
	}
}
},{"events":3,"util":7}],2:[function(require,module,exports){
/**
 * Created by r1ch4 on 02/10/2016.
 */

var JSONTreeView = require('json-tree-view');

var view = new JSONTreeView('example', {
    hello : 'world',
    doubleClick : 'me to edit',
    a : null,
    b : true,
    c : false,
    d : 1,
    e : {nested : 'object'},
    f : [1,2,3]
}, null);


view.expand(true);
view.withRootName = false;

view.on('change', function(self, key, oldValue, newValue){
    console.log('change', key, oldValue, '=>', newValue, self);
});
view.on('rename', function(self, key, oldName, newName) {
    console.log('rename', key, oldName, '=>', newName, self);
});
view.on('delete', function(self, key, value, parentType) {
    console.log('delete', key, '=', value, parentType, self);
});
view.on('append', function(self, key, nameOrValue, newValue) {
    console.log('append', key, nameOrValue, '=>', newValue, self);
});
view.on('click', function(self, key, value) {
    console.log('click', key, '=', value, self);
});
view.on('expand', function(self, key, value) {
    console.log('expand', key, '=', value, self);
});
view.on('collapse', function(self, key, value) {
    console.log('collapse', key, '=', value, self);
});
view.on('refresh', function(self, key, value) {
    console.log('refresh', key, '=', value, self);
});

document.body.appendChild(view.dom);
window.view = view;

view.value.f.pop()
view.value.f.push(9)
view.value.e.a = 'aaa';
view.value.e.d = 'ddd';
delete view.value.c;
view.refresh();

/*
view.alwaysShowRoot = true;
view.readonlyWhenFiltering = true;
view.filterText = 'a';

view.filterText = null;

view.readonly = true;
*/

document.getElementById('filter').addEventListener('input', function() {
    view.filterText = this.value;
});
document.getElementById('root').addEventListener('change', function() {
    view.alwaysShowRoot = !!this.checked;
});
document.getElementById('rowf').addEventListener('change', function() {
    view.readonlyWhenFiltering = !!this.checked;
});
document.getElementById('ro').addEventListener('change', function() {
    view.readonly = !!this.checked;
});
document.getElementById('sc').addEventListener('change', function () {
    view.showCountOfObjectOrArray = !!this.checked;
});

},{"json-tree-view":1}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],7:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":6,"_process":5,"inherits":4}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9KU09OVmlldy5qcyIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2NEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IHJpY2hhcmQubGl2aW5nc3RvbiBvbiAxOC8wMi8yMDE3LlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpLFxuXHRFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEpTT05UcmVlVmlldztcbnV0aWwuaW5oZXJpdHMoSlNPTlRyZWVWaWV3LCBFRSk7XG5cblxuZnVuY3Rpb24gSlNPTlRyZWVWaWV3KG5hbWVfLCB2YWx1ZV8sIHBhcmVudF8sIGlzUm9vdF8pe1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0aWYgKHR5cGVvZiBpc1Jvb3RfID09PSAndW5kZWZpbmVkJyAmJiBhcmd1bWVudHMubGVuZ3RoIDwgNCkge1xuXHRcdGlzUm9vdF8gPSB0cnVlO1xuXHR9XG5cblx0RUUuY2FsbChzZWxmKTtcblxuXHRpZihhcmd1bWVudHMubGVuZ3RoIDwgMil7XG5cdFx0dmFsdWVfID0gbmFtZV87XG5cdFx0bmFtZV8gPSB1bmRlZmluZWQ7XG5cdH1cblxuXHR2YXIgbmFtZSwgdmFsdWUsIHR5cGUsIGZpbHRlclRleHQgPSAnJywgaGlkZGVuID0gZmFsc2UsIHJlYWRvbmx5ID0gZmFsc2UsXG5cdFx0cmVhZG9ubHlXaGVuRmlsdGVyaW5nID0gZmFsc2UsIGFsd2F5c1Nob3dSb290ID0gZmFsc2UsXG5cdFx0c2hvd0NvdW50ID0gcGFyZW50XyA/IHBhcmVudF8uc2hvd0NvdW50T2ZPYmplY3RPckFycmF5IDogdHJ1ZSxcblx0XHRpbmNsdWRpbmdSb290TmFtZSA9IHRydWUsXG5cdFx0ZG9tRXZlbnRMaXN0ZW5lcnMgPSBbXSwgY2hpbGRyZW4gPSBbXSwgZXhwYW5kZWQgPSBmYWxzZSxcblx0XHRlZGl0dGluZ05hbWUgPSBmYWxzZSwgZWRpdHRpbmdWYWx1ZSA9IGZhbHNlLFxuXHRcdG5hbWVFZGl0YWJsZSA9IHRydWUsIHZhbHVlRWRpdGFibGUgPSB0cnVlO1xuXG5cdHZhciBkb20gPSB7XG5cdFx0Y29udGFpbmVyIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG5cdFx0Y29sbGFwc2VFeHBhbmQgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcblx0XHRuYW1lIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG5cdFx0c2VwYXJhdG9yIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG5cdFx0dmFsdWUgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcblx0XHRzcGFjaW5nOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcblx0XHRkZWxldGUgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcblx0XHRjaGlsZHJlbiA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuXHRcdGluc2VydCA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cdH07XG5cblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzZWxmLCB7XG5cblx0XHRkb20gOiB7XG5cdFx0XHR2YWx1ZSA6IGRvbS5jb250YWluZXIsXG5cdFx0XHRlbnVtZXJhYmxlIDogdHJ1ZVxuXHRcdH0sXG5cblx0XHRpc1Jvb3Q6IHtcblx0XHRcdGdldCA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHJldHVybiBpc1Jvb3RfO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRwYXJlbnQ6IHtcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBwYXJlbnRfO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRjaGlsZHJlbjoge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJlc3VsdCA9IG51bGw7XG5cdFx0XHRcdGlmICh0eXBlID09PSAnYXJyYXknKSB7XG5cdFx0XHRcdFx0cmVzdWx0ID0gY2hpbGRyZW47XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRyZXN1bHQgPSB7fTtcblx0XHRcdFx0XHRjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRcdHJlc3VsdFtlLm5hbWVdID0gZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRyZWFkb25seToge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICEhKHJlYWRvbmx5ICYgMSk7XG5cdFx0XHR9LFxuXHRcdFx0c2V0OiBmdW5jdGlvbihybykge1xuXHRcdFx0XHRyZWFkb25seSA9IHNldEJpdChyZWFkb25seSwgMCwgK3JvKTtcblx0XHRcdFx0ISEocmVhZG9ubHkgJiAxKSA/IGRvbS5jb250YWluZXIuY2xhc3NMaXN0LmFkZCgncmVhZG9ubHknKVxuXHRcdFx0XHRcdFx0OiBkb20uY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3JlYWRvbmx5Jyk7XG5cdFx0XHRcdGZvciAodmFyIGkgaW4gY2hpbGRyZW4pIHtcblx0XHRcdFx0XHRjaGlsZHJlbltpXS5yZWFkb25seSA9IHNldEJpdChyZWFkb25seSwgMCwgK3JvKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRyZWFkb25seVdoZW5GaWx0ZXJpbmc6IHtcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiByZWFkb25seVdoZW5GaWx0ZXJpbmc7XG5cdFx0XHR9LFxuXHRcdFx0c2V0OiBmdW5jdGlvbihyb3dmKSB7XG5cdFx0XHRcdHJlYWRvbmx5ID0gc2V0Qml0KHJlYWRvbmx5LCAxLCArcm93Zik7XG5cdFx0XHRcdHJlYWRvbmx5V2hlbkZpbHRlcmluZyA9IHJvd2Y7XG5cdFx0XHRcdChyZWFkb25seSAmJiB0aGlzLmZpbHRlclRleHQpIHx8ICEhKHJlYWRvbmx5ICYgMSlcblx0XHRcdFx0XHRcdD8gZG9tLmNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdyZWFkb25seScpXG5cdFx0XHRcdFx0XHRcdFx0OiBkb20uY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3JlYWRvbmx5Jyk7XG5cdFx0XHRcdGZvciAodmFyIGkgaW4gY2hpbGRyZW4pIHtcblx0XHRcdFx0XHRjaGlsZHJlbltpXS5yZWFkb25seSA9IHNldEJpdChyZWFkb25seSwgMSwgK3Jvd2YpO1xuXHRcdFx0XHRcdGNoaWxkcmVuW2ldLnJlYWRvbmx5V2hlbkZpbHRlcmluZyA9IHJvd2Y7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0aGlkZGVuOiB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaGlkZGVuO1xuXHRcdFx0fSxcblx0XHRcdHNldDogZnVuY3Rpb24oaCkge1xuXHRcdFx0XHRoaWRkZW4gPSBoO1xuXHRcdFx0XHRoID8gZG9tLmNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXHRcdFx0XHRcdFx0OiBkb20uY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXHRcdFx0XHRpZiAoIWgpIHtcblx0XHRcdFx0XHRwYXJlbnRfICYmIChwYXJlbnRfLmhpZGRlbiA9IGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHNob3dDb3VudE9mT2JqZWN0T3JBcnJheToge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIHNob3dDb3VudDtcblx0XHRcdH0sXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKHNob3cpIHtcblx0XHRcdFx0c2hvd0NvdW50ID0gc2hvdztcblx0XHRcdFx0Zm9yICh2YXIgaSBpbiBjaGlsZHJlbikge1xuXHRcdFx0XHRcdGNoaWxkcmVuW2ldLnNob3dDb3VudE9mT2JqZWN0T3JBcnJheSA9IHNob3c7XG5cdFx0XHRcdH1cblx0XHRcdFx0KHRoaXMudHlwZSA9PT0gJ29iamVjdCcgfHwgdGhpcy50eXBlID09PSAnYXJyYXknKSAmJiB0aGlzLnVwZGF0ZUNvdW50KCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGZpbHRlclRleHQ6IHtcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBmaWx0ZXJUZXh0O1xuXHRcdFx0fSxcblx0XHRcdHNldDogZnVuY3Rpb24odGV4dCkge1xuXHRcdFx0XHRmaWx0ZXJUZXh0ID0gdGV4dDtcblx0XHRcdFx0aWYgKHRleHQpIHtcblx0XHRcdFx0XHRpZiAocmVhZG9ubHkgPiAwKSB7XG5cdFx0XHRcdFx0XHRkb20uY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3JlYWRvbmx5Jyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZhciBrZXkgPSB0aGlzLm5hbWUgKyAnJztcblx0XHRcdFx0XHR2YXIgdmFsdWUgPSB0aGlzLnZhbHVlICsgJyc7XG5cdFx0XHRcdFx0aWYgKGtleS5pbmRleE9mKHRleHQpID4gLTEgfHwgdmFsdWUuaW5kZXhPZih0ZXh0KSA+IC0xKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmhpZGRlbiA9IGZhbHNlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAoIXRoaXMuYWx3YXlzU2hvd1Jvb3QgfHwgIWlzUm9vdF8pIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5oaWRkZW4gPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQhdGhpcy5yZWFkb25seSAmJiBkb20uY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3JlYWRvbmx5Jyk7XG5cdFx0XHRcdFx0dGhpcy5oaWRkZW4gPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKHZhciBpIGluIGNoaWxkcmVuKSB7XG5cdFx0XHRcdFx0Y2hpbGRyZW5baV0uZmlsdGVyVGV4dCA9IHRleHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0YWx3YXlzU2hvd1Jvb3Q6IHtcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBhbHdheXNTaG93Um9vdDtcblx0XHRcdH0sXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChpc1Jvb3RfICYmIHRoaXMuZmlsdGVyVGV4dCkge1xuXHRcdFx0XHRcdHRoaXMuaGlkZGVuID0gIXZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGFsd2F5c1Nob3dSb290ID0gdmFsdWU7XG5cdFx0XHRcdGZvciAodmFyIGkgaW4gY2hpbGRyZW4pIHtcblx0XHRcdFx0XHRjaGlsZHJlbltpXS5hbHdheXNTaG93Um9vdCA9IHZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHdpdGhSb290TmFtZToge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGluY2x1ZGluZ1Jvb3ROYW1lO1xuXHRcdFx0fSxcblx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0aW5jbHVkaW5nUm9vdE5hbWUgPSB2YWx1ZTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0bmFtZSA6IHtcblx0XHRcdGdldCA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHJldHVybiBuYW1lO1xuXHRcdFx0fSxcblxuXHRcdFx0c2V0IDogc2V0TmFtZSxcblx0XHRcdGVudW1lcmFibGUgOiB0cnVlXG5cdFx0fSxcblxuXHRcdHZhbHVlIDoge1xuXHRcdFx0Z2V0IDogZnVuY3Rpb24oKXtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSxcblxuXHRcdFx0c2V0IDogc2V0VmFsdWUsXG5cdFx0XHRlbnVtZXJhYmxlIDogdHJ1ZVxuXHRcdH0sXG5cblx0XHR0eXBlIDoge1xuXHRcdFx0Z2V0IDogZnVuY3Rpb24oKXtcblx0XHRcdFx0cmV0dXJuIHR5cGU7XG5cdFx0XHR9LFxuXG5cdFx0XHRlbnVtZXJhYmxlIDogdHJ1ZVxuXHRcdH0sXG5cblx0XHRuYW1lRWRpdGFibGUgOiB7XG5cdFx0XHRnZXQgOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRyZXR1cm4gbmFtZUVkaXRhYmxlO1xuXHRcdFx0fSxcblxuXHRcdFx0c2V0IDogZnVuY3Rpb24odmFsdWUpe1xuXHRcdFx0XHRuYW1lRWRpdGFibGUgPSAhIXZhbHVlO1xuXHRcdFx0fSxcblxuXHRcdFx0ZW51bWVyYWJsZSA6IHRydWVcblx0XHR9LFxuXG5cdFx0dmFsdWVFZGl0YWJsZSA6IHtcblx0XHRcdGdldCA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHJldHVybiB2YWx1ZUVkaXRhYmxlO1xuXHRcdFx0fSxcblxuXHRcdFx0c2V0IDogZnVuY3Rpb24odmFsdWUpe1xuXHRcdFx0XHR2YWx1ZUVkaXRhYmxlID0gISF2YWx1ZTtcblx0XHRcdH0sXG5cblx0XHRcdGVudW1lcmFibGUgOiB0cnVlXG5cdFx0fSxcblxuXHRcdHJlZnJlc2ggOiB7XG5cdFx0XHR2YWx1ZSA6IHJlZnJlc2gsXG5cdFx0XHRlbnVtZXJhYmxlIDogdHJ1ZVxuXHRcdH0sXG5cblx0XHR1cGRhdGVDb3VudDoge1xuXHRcdFx0dmFsdWU6IHVwZGF0ZU9iamVjdENoaWxkQ291bnQsXG5cdFx0XHRlbnVtZXJhYmxlOiB0cnVlXG5cdFx0fSxcblxuXHRcdGNvbGxhcHNlIDoge1xuXHRcdFx0dmFsdWUgOiBjb2xsYXBzZSxcblx0XHRcdGVudW1lcmFibGUgOiB0cnVlXG5cdFx0fSxcblxuXHRcdGV4cGFuZCA6IHtcblx0XHRcdHZhbHVlIDogZXhwYW5kLFxuXHRcdFx0ZW51bWVyYWJsZSA6IHRydWVcblx0XHR9LFxuXG5cdFx0ZGVzdHJveSA6IHtcblx0XHRcdHZhbHVlIDogZGVzdHJveSxcblx0XHRcdGVudW1lcmFibGUgOiB0cnVlXG5cdFx0fSxcblxuXHRcdGVkaXROYW1lIDoge1xuXHRcdFx0dmFsdWUgOiBlZGl0RmllbGQuYmluZChudWxsLCAnbmFtZScpLFxuXHRcdFx0ZW51bWVyYWJsZSA6IHRydWVcblx0XHR9LFxuXG5cdFx0ZWRpdFZhbHVlIDoge1xuXHRcdFx0dmFsdWUgOiBlZGl0RmllbGQuYmluZChudWxsLCAndmFsdWUnKSxcblx0XHRcdGVudW1lcmFibGUgOiB0cnVlXG5cdFx0fVxuXG5cdH0pO1xuXG5cblx0T2JqZWN0LmtleXMoZG9tKS5mb3JFYWNoKGZ1bmN0aW9uKGspe1xuXHRcdGlmIChrID09PSAnZGVsZXRlJyAmJiBzZWxmLmlzUm9vdCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBlbGVtZW50ID0gZG9tW2tdO1xuXG5cdFx0aWYoayA9PSAnY29udGFpbmVyJyl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZWxlbWVudC5jbGFzc05hbWUgPSBrO1xuXHRcdGlmIChbJ25hbWUnLCAnc2VwYXJhdG9yJywgJ3ZhbHVlJywgJ3NwYWNpbmcnXS5pbmRleE9mKGspID4gLTEpIHtcblx0XHRcdGVsZW1lbnQuY2xhc3NOYW1lICs9ICcgaXRlbSc7XG5cdFx0fVxuXHRcdGRvbS5jb250YWluZXIuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG5cdH0pO1xuXG5cdGRvbS5jb250YWluZXIuY2xhc3NOYW1lID0gJ2pzb25WaWV3JztcblxuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS5jb2xsYXBzZUV4cGFuZCwgJ2NsaWNrJywgb25Db2xsYXBzZUV4cGFuZENsaWNrKTtcblx0YWRkRG9tRXZlbnRMaXN0ZW5lcihkb20udmFsdWUsICdjbGljaycsIGV4cGFuZC5iaW5kKG51bGwsIGZhbHNlKSk7XG5cdGFkZERvbUV2ZW50TGlzdGVuZXIoZG9tLm5hbWUsICdjbGljaycsIGV4cGFuZC5iaW5kKG51bGwsIGZhbHNlKSk7XG5cblx0YWRkRG9tRXZlbnRMaXN0ZW5lcihkb20ubmFtZSwgJ2RibGNsaWNrJywgZWRpdEZpZWxkLmJpbmQobnVsbCwgJ25hbWUnKSk7XG5cdGFkZERvbUV2ZW50TGlzdGVuZXIoZG9tLm5hbWUsICdjbGljaycsIGl0ZW1DbGlja2VkLmJpbmQobnVsbCwgJ25hbWUnKSk7XG5cdGFkZERvbUV2ZW50TGlzdGVuZXIoZG9tLm5hbWUsICdibHVyJywgZWRpdEZpZWxkU3RvcC5iaW5kKG51bGwsICduYW1lJykpO1xuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS5uYW1lLCAna2V5cHJlc3MnLFxuXHRcdFx0ZWRpdEZpZWxkS2V5UHJlc3NlZC5iaW5kKG51bGwsICduYW1lJykpO1xuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS5uYW1lLCAna2V5ZG93bicsXG5cdFx0XHRlZGl0RmllbGRUYWJQcmVzc2VkLmJpbmQobnVsbCwgJ25hbWUnKSk7XG5cblx0YWRkRG9tRXZlbnRMaXN0ZW5lcihkb20udmFsdWUsICdkYmxjbGljaycsIGVkaXRGaWVsZC5iaW5kKG51bGwsICd2YWx1ZScpKTtcblx0YWRkRG9tRXZlbnRMaXN0ZW5lcihkb20udmFsdWUsICdjbGljaycsIGl0ZW1DbGlja2VkLmJpbmQobnVsbCwgJ3ZhbHVlJykpO1xuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS52YWx1ZSwgJ2JsdXInLCBlZGl0RmllbGRTdG9wLmJpbmQobnVsbCwgJ3ZhbHVlJykpO1xuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS52YWx1ZSwgJ2tleXByZXNzJyxcblx0XHRcdGVkaXRGaWVsZEtleVByZXNzZWQuYmluZChudWxsLCAndmFsdWUnKSk7XG5cdGFkZERvbUV2ZW50TGlzdGVuZXIoZG9tLnZhbHVlLCAna2V5ZG93bicsXG5cdFx0XHRlZGl0RmllbGRUYWJQcmVzc2VkLmJpbmQobnVsbCwgJ3ZhbHVlJykpO1xuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS52YWx1ZSwgJ2tleWRvd24nLCBudW1lcmljVmFsdWVLZXlEb3duKTtcblxuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS5pbnNlcnQsICdjbGljaycsIG9uSW5zZXJ0Q2xpY2spO1xuXHRhZGREb21FdmVudExpc3RlbmVyKGRvbS5kZWxldGUsICdjbGljaycsIG9uRGVsZXRlQ2xpY2spO1xuXG5cdHNldE5hbWUobmFtZV8pO1xuXHRzZXRWYWx1ZSh2YWx1ZV8pO1xuXG5cdGZ1bmN0aW9uIHNldEJpdChuLCBpLCBiKSB7XG5cdFx0dmFyIGogPSAwO1xuXHRcdHdoaWxlICgobiA+PiBqIDw8IGopKSB7XG5cdFx0XHRqKys7XG5cdFx0fVxuXHRcdHJldHVybiBpID49IGpcblx0XHRcdFx0PyAobiB8ICtiIDw8IGkgKVxuXHRcdFx0XHRcdFx0OiAobiA+PiAoaSArIDEpIDw8IChpICsgMSkpIHwgKG4gJSAobiA+PiBpIDw8IGkpKSB8ICgrYiA8PCBpKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gc3F1YXJlYnJhY2tldGlmeShleHApIHtcblx0XHRyZXR1cm4gdHlwZW9mIGV4cCA9PT0gJ3N0cmluZydcblx0XHRcdD8gZXhwLnJlcGxhY2UoL1xcLihbMC05XSspL2csICdbJDFdJykgOiBleHAgKyAnJztcblx0fVxuXG5cdGZ1bmN0aW9uIHJlZnJlc2gobm9FbWl0dGluZyl7XG5cdFx0dmFyIGV4cGFuZGFibGUgPSB0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2FycmF5JztcblxuXHRcdGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuXHRcdFx0Y2hpbGQucmVmcmVzaCh0cnVlKTtcblx0XHR9KTtcblxuXHRcdGRvbS5jb2xsYXBzZUV4cGFuZC5zdHlsZS5kaXNwbGF5ID0gZXhwYW5kYWJsZSA/ICcnIDogJ25vbmUnO1xuXG5cdFx0aWYoZXhwYW5kZWQgJiYgZXhwYW5kYWJsZSl7XG5cdFx0XHRleHBhbmQoZmFsc2UsIG5vRW1pdHRpbmcpO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0Y29sbGFwc2UoZmFsc2UsIG5vRW1pdHRpbmcpO1xuXHRcdH1cblx0XHQhbm9FbWl0dGluZyAmJiBzZWxmLmVtaXQoJ3JlZnJlc2gnLCBzZWxmLCBzZWxmLm5hbWUsIHNlbGYudmFsdWUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBjb2xsYXBzZShyZWN1cnNpdmUsIG5vRW1pdHRpbmcpe1xuXHRcdGlmKHJlY3Vyc2l2ZSl7XG5cdFx0XHRjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcblx0XHRcdFx0Y2hpbGQuY29sbGFwc2UodHJ1ZSwgdHJ1ZSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRleHBhbmRlZCA9IGZhbHNlO1xuXG5cdFx0ZG9tLmNoaWxkcmVuLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdFx0ZG9tLmNvbGxhcHNlRXhwYW5kLmNsYXNzTmFtZSA9ICdleHBhbmQnO1xuXHRcdGRvbS5jb250YWluZXIuY2xhc3NMaXN0LmFkZCgnY29sbGFwc2VkJyk7XG5cdFx0ZG9tLmNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdleHBhbmRlZCcpO1xuXHRcdCFub0VtaXR0aW5nICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2FycmF5Jylcblx0XHRcdCYmIHNlbGYuZW1pdCgnY29sbGFwc2UnLCBzZWxmLCBzZWxmLm5hbWUsIHNlbGYudmFsdWUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBleHBhbmQocmVjdXJzaXZlLCBub0VtaXR0aW5nKXtcblx0XHR2YXIga2V5cztcblxuXHRcdGlmKHR5cGUgPT0gJ29iamVjdCcpe1xuXHRcdFx0a2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlID09ICdhcnJheScpe1xuXHRcdFx0a2V5cyA9IHZhbHVlLm1hcChmdW5jdGlvbih2LCBrKXtcblx0XHRcdFx0cmV0dXJuIGs7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdGtleXMgPSBbXTtcblx0XHR9XG5cblx0XHQvLyBSZW1vdmUgY2hpbGRyZW4gdGhhdCBubyBsb25nZXIgZXhpc3Rcblx0XHRmb3IodmFyIGkgPSBjaGlsZHJlbi5sZW5ndGggLSAxOyBpID49IDA7IGkgLS0pe1xuXHRcdFx0dmFyIGNoaWxkID0gY2hpbGRyZW5baV07XG5cblx0XHRcdGlmKGtleXMuaW5kZXhPZihjaGlsZC5uYW1lKSA9PSAtMSl7XG5cdFx0XHRcdGNoaWxkcmVuLnNwbGljZShpLCAxKTtcblx0XHRcdFx0cmVtb3ZlQ2hpbGQoY2hpbGQsIG5vRW1pdHRpbmcpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmKHR5cGUgIT0gJ29iamVjdCcgJiYgdHlwZSAhPSAnYXJyYXknKXtcblx0XHRcdHJldHVybiBjb2xsYXBzZSgpO1xuXHRcdH1cblxuXHRcdGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuXHRcdFx0YWRkQ2hpbGQoa2V5LCB2YWx1ZVtrZXldKTtcblx0XHR9KTtcblxuXHRcdGlmKHJlY3Vyc2l2ZSl7XG5cdFx0XHRjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcblx0XHRcdFx0Y2hpbGQuZXhwYW5kKHRydWUsIHRydWUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZXhwYW5kZWQgPSB0cnVlO1xuXHRcdGRvbS5jaGlsZHJlbi5zdHlsZS5kaXNwbGF5ID0gJyc7XG5cdFx0ZG9tLmNvbGxhcHNlRXhwYW5kLmNsYXNzTmFtZSA9ICdjb2xsYXBzZSc7XG5cdFx0ZG9tLmNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdleHBhbmRlZCcpO1xuXHRcdGRvbS5jb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnY29sbGFwc2VkJyk7XG5cdFx0IW5vRW1pdHRpbmcgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnYXJyYXknKVxuXHRcdFx0JiYgc2VsZi5lbWl0KCdleHBhbmQnLCBzZWxmLCBzZWxmLm5hbWUsIHNlbGYudmFsdWUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBkZXN0cm95KCl7XG5cdFx0dmFyIGNoaWxkLCBldmVudDtcblxuXHRcdHdoaWxlKGV2ZW50ID0gZG9tRXZlbnRMaXN0ZW5lcnMucG9wKCkpe1xuXHRcdFx0ZXZlbnQuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50Lm5hbWUsIGV2ZW50LmZuKTtcblx0XHR9XG5cblx0XHR3aGlsZShjaGlsZCA9IGNoaWxkcmVuLnBvcCgpKXtcblx0XHRcdHJlbW92ZUNoaWxkKGNoaWxkLCB0cnVlKTtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIHNldE5hbWUobmV3TmFtZSl7XG5cdFx0dmFyIG5hbWVUeXBlID0gdHlwZW9mIG5ld05hbWUsXG5cdFx0XHRvbGROYW1lID0gbmFtZTtcblxuXHRcdGlmKG5ld05hbWUgPT09IG5hbWUpe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmKG5hbWVUeXBlICE9ICdzdHJpbmcnICYmIG5hbWVUeXBlICE9ICdudW1iZXInKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcignTmFtZSBtdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgbnVtYmVyLCAnICsgbmV3TmFtZSk7XG5cdFx0fVxuXG5cdFx0ZG9tLm5hbWUuaW5uZXJUZXh0ID0gbmV3TmFtZTtcblx0XHRuYW1lID0gbmV3TmFtZTtcblx0XHRzZWxmLmVtaXQoJ3JlbmFtZScsIHNlbGYsIG5hbWUsIG9sZE5hbWUsIG5ld05hbWUsIHRydWUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBzZXRWYWx1ZShuZXdWYWx1ZSl7XG5cdFx0dmFyIG9sZFZhbHVlID0gdmFsdWUsXG5cdFx0XHRzdHIsIGxlbjtcblxuXHRcdHR5cGUgPSBnZXRUeXBlKG5ld1ZhbHVlKTtcblxuXHRcdHN3aXRjaCh0eXBlKXtcblx0XHRcdGNhc2UgJ251bGwnOlxuXHRcdFx0XHRzdHIgPSAnbnVsbCc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndW5kZWZpbmVkJzpcblx0XHRcdFx0c3RyID0gJ3VuZGVmaW5lZCc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnb2JqZWN0Jzpcblx0XHRcdFx0bGVuID0gT2JqZWN0LmtleXMobmV3VmFsdWUpLmxlbmd0aDtcblx0XHRcdFx0c3RyID0gc2hvd0NvdW50ID8gJ09iamVjdFsnICsgbGVuICsgJ10nIDogKGxlbiA8IDEgPyAne30nIDogJycpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnYXJyYXknOlxuXHRcdFx0XHRsZW4gPSBuZXdWYWx1ZS5sZW5ndGg7XG5cdFx0XHRcdHN0ciA9IHNob3dDb3VudCA/ICdBcnJheVsnICsgbGVuICsgJ10nIDogKGxlbiA8IDEgPyAnW10nIDogJycpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0c3RyID0gbmV3VmFsdWU7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdGRvbS52YWx1ZS5pbm5lclRleHQgPSBzdHI7XG5cdFx0ZG9tLnZhbHVlLmNsYXNzTmFtZSA9ICd2YWx1ZSBpdGVtICcgKyB0eXBlO1xuXG5cdFx0aWYobmV3VmFsdWUgPT09IHZhbHVlKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YWx1ZSA9IG5ld1ZhbHVlO1xuXG5cdFx0aWYodHlwZSA9PSAnYXJyYXknIHx8IHR5cGUgPT0gJ29iamVjdCcpe1xuXHRcdFx0Ly8gQ2Fubm90IGVkaXQgb2JqZWN0cyBhcyBzdHJpbmcgYmVjYXVzZSB0aGUgZm9ybWF0dGluZyBpcyB0b28gbWVzc3lcblx0XHRcdC8vIFdvdWxkIGhhdmUgdG8gZWl0aGVyIHBhc3MgYXMgSlNPTiBhbmQgZm9yY2UgdXNlciB0byB3cmFwIHByb3BlcnRpZXMgaW4gcXVvdGVzXG5cdFx0XHQvLyBPciBmaXJzdCBKU09OIHN0cmluZ2lmeSB0aGUgaW5wdXQgYmVmb3JlIHBhc3NpbmcsIHRoaXMgY291bGQgYWxsb3cgdXNlcnMgdG8gcmVmZXJlbmNlIGdsb2JhbHNcblxuXHRcdFx0Ly8gSW5zdGVhZCB0aGUgdXNlciBjYW4gbW9kaWZ5IGluZGl2aWR1YWwgcHJvcGVydGllcywgb3IganVzdCBkZWxldGUgdGhlIG9iamVjdCBhbmQgc3RhcnQgYWdhaW5cblx0XHRcdHZhbHVlRWRpdGFibGUgPSBmYWxzZTtcblxuXHRcdFx0aWYodHlwZSA9PSAnYXJyYXknKXtcblx0XHRcdFx0Ly8gT2J2aW91c2x5IGNhbm5vdCBtb2RpZnkgYXJyYXkga2V5c1xuXHRcdFx0XHRuYW1lRWRpdGFibGUgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRzZWxmLmVtaXQoJ2NoYW5nZScsIHNlbGYsIG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSk7XG5cdFx0cmVmcmVzaCgpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiB1cGRhdGVPYmplY3RDaGlsZENvdW50KCkge1xuXHRcdHZhciBzdHIgPSAnJywgbGVuO1xuXHRcdGlmICh0eXBlID09PSAnb2JqZWN0Jykge1xuXHRcdFx0bGVuID0gT2JqZWN0LmtleXModmFsdWUpLmxlbmd0aDtcblx0XHRcdHN0ciA9IHNob3dDb3VudCA/ICdPYmplY3RbJyArIGxlbiArICddJyA6IChsZW4gPCAxID8gJ3t9JyA6ICcnKTtcblx0XHR9XG5cdFx0aWYgKHR5cGUgPT09ICdhcnJheScpIHtcblx0XHRcdGxlbiA9IHZhbHVlLmxlbmd0aDtcblx0XHRcdHN0ciA9IHNob3dDb3VudCA/ICdBcnJheVsnICsgbGVuICsgJ10nIDogKGxlbiA8IDEgPyAnW10nIDogJycpO1xuXHRcdH1cblx0XHRkb20udmFsdWUuaW5uZXJUZXh0ID0gc3RyO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBhZGRDaGlsZChrZXksIHZhbCwgbm9FbWl0dGluZyl7XG5cdFx0dmFyIGNoaWxkO1xuXG5cdFx0Zm9yKHZhciBpID0gMCwgbGVuID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbGVuOyBpICsrKXtcblx0XHRcdGlmKGNoaWxkcmVuW2ldLm5hbWUgPT0ga2V5KXtcblx0XHRcdFx0Y2hpbGQgPSBjaGlsZHJlbltpXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYoY2hpbGQpe1xuXHRcdFx0Y2hpbGQudmFsdWUgPSB2YWw7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRjaGlsZCA9IG5ldyBKU09OVHJlZVZpZXcoa2V5LCB2YWwsIHNlbGYsIGZhbHNlKTtcblx0XHRcdGNoaWxkLm9uKCdyZW5hbWUnLCBvbkNoaWxkUmVuYW1lKTtcblx0XHRcdGNoaWxkLm9uKCdkZWxldGUnLCBvbkNoaWxkRGVsZXRlKTtcblx0XHRcdGNoaWxkLm9uKCdjaGFuZ2UnLCBvbkNoaWxkQ2hhbmdlKTtcblx0XHRcdGNoaWxkLm9uKCdhcHBlbmQnLCBvbkNoaWxkQXBwZW5kKTtcblx0XHRcdGNoaWxkLm9uKCdjbGljaycsIG9uQ2hpbGRDbGljayk7XG5cdFx0XHRjaGlsZC5vbignZXhwYW5kJywgb25DaGlsZEV4cGFuZCk7XG5cdFx0XHRjaGlsZC5vbignY29sbGFwc2UnLCBvbkNoaWxkQ29sbGFwc2UpO1xuXHRcdFx0Y2hpbGQub24oJ3JlZnJlc2gnLCBvbkNoaWxkUmVmcmVzaCk7XG5cdFx0XHRjaGlsZHJlbi5wdXNoKGNoaWxkKTtcblx0XHRcdGlmICghbm9FbWl0dGluZykge1xuXHRcdFx0XHRjaGlsZC5lbWl0KCdhcHBlbmQnLCBjaGlsZCwga2V5LCAndmFsdWUnLCB2YWwsIHRydWUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGRvbS5jaGlsZHJlbi5hcHBlbmRDaGlsZChjaGlsZC5kb20pO1xuXG5cdFx0cmV0dXJuIGNoaWxkO1xuXHR9XG5cblxuXHRmdW5jdGlvbiByZW1vdmVDaGlsZChjaGlsZCwgbm9FbWl0dGluZyl7XG5cdFx0aWYoY2hpbGQuZG9tLnBhcmVudE5vZGUpe1xuXHRcdFx0ZG9tLmNoaWxkcmVuLnJlbW92ZUNoaWxkKGNoaWxkLmRvbSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFub0VtaXR0aW5nICYmIGNoaWxkICYmIGNoaWxkLm5hbWUgIT09ICcnKSB7XG5cdFx0XHRjaGlsZC5lbWl0KCdkZWxldGUnLCBjaGlsZCwgY2hpbGQubmFtZSwgY2hpbGQudmFsdWUsIGNoaWxkLnBhcmVudC50eXBlLFxuXHRcdFx0XHR0cnVlKTtcblx0XHR9XG5cdFx0Y2hpbGQuZGVzdHJveSgpO1xuXHRcdGNoaWxkLnJlbW92ZUFsbExpc3RlbmVycygpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBlZGl0RmllbGQoZmllbGQpe1xuXHRcdGlmKChyZWFkb25seSA+IDAgJiYgZmlsdGVyVGV4dCkgfHwgISEocmVhZG9ubHkgJiAxKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZihmaWVsZCA9PT0gJ3ZhbHVlJyAmJiAodHlwZSA9PT0gJ29iamVjdCcgfHwgdHlwZSA9PT0gJ2FycmF5Jykpe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZihwYXJlbnRfICYmIHBhcmVudF8udHlwZSA9PSAnYXJyYXknKXtcblx0XHRcdC8vIE9idmlvdXNseSBjYW5ub3QgbW9kaWZ5IGFycmF5IGtleXNcblx0XHRcdG5hbWVFZGl0YWJsZSA9IGZhbHNlO1xuXHRcdH1cblx0XHR2YXIgZWRpdGFibGUgPSBmaWVsZCA9PSAnbmFtZScgPyBuYW1lRWRpdGFibGUgOiB2YWx1ZUVkaXRhYmxlLFxuXHRcdFx0ZWxlbWVudCA9IGRvbVtmaWVsZF07XG5cblx0XHRpZighZWRpdGFibGUgJiYgKHBhcmVudF8gJiYgcGFyZW50Xy50eXBlID09PSAnYXJyYXknKSl7XG5cdFx0XHRpZiAoIXBhcmVudF8uaW5zZXJ0aW5nKSB7XG5cdFx0XHRcdC8vIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGVkaXQgYW4gYXJyYXkgaW5kZXguJyk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZihmaWVsZCA9PSAndmFsdWUnICYmIHR5cGUgPT0gJ3N0cmluZycpe1xuXHRcdFx0ZWxlbWVudC5pbm5lclRleHQgPSAnXCInICsgdmFsdWUgKyAnXCInO1xuXHRcdH1cblxuXHRcdGlmKGZpZWxkID09ICduYW1lJyl7XG5cdFx0XHRlZGl0dGluZ05hbWUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGZpZWxkID09ICd2YWx1ZScpe1xuXHRcdFx0ZWRpdHRpbmdWYWx1ZSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdlZGl0Jyk7XG5cdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScsIHRydWUpO1xuXHRcdGVsZW1lbnQuZm9jdXMoKTtcblx0XHRkb2N1bWVudC5leGVjQ29tbWFuZCgnc2VsZWN0QWxsJywgZmFsc2UsIG51bGwpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBpdGVtQ2xpY2tlZChmaWVsZCkge1xuXHRcdHNlbGYuZW1pdCgnY2xpY2snLCBzZWxmLFxuXHRcdFx0IXNlbGYud2l0aFJvb3ROYW1lICYmIHNlbGYuaXNSb290ID8gJycgOiBzZWxmLm5hbWUsIHNlbGYudmFsdWUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBlZGl0RmllbGRTdG9wKGZpZWxkKXtcblx0XHR2YXIgZWxlbWVudCA9IGRvbVtmaWVsZF07XG5cdFx0XG5cdFx0aWYoZmllbGQgPT0gJ25hbWUnKXtcblx0XHRcdGlmKCFlZGl0dGluZ05hbWUpe1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRlZGl0dGluZ05hbWUgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRpZihmaWVsZCA9PSAndmFsdWUnKXtcblx0XHRcdGlmKCFlZGl0dGluZ1ZhbHVlKXtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0ZWRpdHRpbmdWYWx1ZSA9IGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHRpZihmaWVsZCA9PSAnbmFtZScpe1xuXHRcdFx0dmFyIHAgPSBzZWxmLnBhcmVudDtcblx0XHRcdHZhciBlZGl0dGluZ05hbWVUZXh0ID0gZWxlbWVudC5pbm5lclRleHQ7XG5cdFx0XHRpZiAocCAmJiBwLnR5cGUgPT09ICdvYmplY3QnICYmIGVkaXR0aW5nTmFtZVRleHQgaW4gcC52YWx1ZSkge1xuXHRcdFx0XHRlbGVtZW50LmlubmVyVGV4dCA9IG5hbWU7XG5cdFx0XHRcdGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnZWRpdCcpO1xuXHRcdFx0XHRlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJyk7XG5cdFx0XHRcdC8vIHRocm93IG5ldyBFcnJvcignTmFtZSBleGlzdCwgJyArIGVkaXR0aW5nTmFtZVRleHQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHNldE5hbWUuY2FsbChzZWxmLCBlZGl0dGluZ05hbWVUZXh0KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdHZhciB0ZXh0ID0gZWxlbWVudC5pbm5lclRleHQ7XG5cdFx0XHR0cnl7XG5cdFx0XHRcdHNldFZhbHVlKHRleHQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogSlNPTi5wYXJzZSh0ZXh0KSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlcnIpe1xuXHRcdFx0XHRzZXRWYWx1ZSh0ZXh0KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2VkaXQnKTtcblx0XHRlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJyk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGVkaXRGaWVsZEtleVByZXNzZWQoZmllbGQsIGUpe1xuXHRcdHN3aXRjaChlLmtleSl7XG5cdFx0XHRjYXNlICdFc2NhcGUnOlxuXHRcdFx0Y2FzZSAnRW50ZXInOlxuXHRcdFx0XHRlZGl0RmllbGRTdG9wKGZpZWxkKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblxuXHRmdW5jdGlvbiBlZGl0RmllbGRUYWJQcmVzc2VkKGZpZWxkLCBlKXtcblx0XHRpZihlLmtleSA9PSAnVGFiJyl7XG5cdFx0XHRlZGl0RmllbGRTdG9wKGZpZWxkKTtcblxuXHRcdFx0aWYoZmllbGQgPT0gJ25hbWUnKXtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRlZGl0RmllbGQoJ3ZhbHVlJyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRlZGl0RmllbGRTdG9wKGZpZWxkKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG51bWVyaWNWYWx1ZUtleURvd24oZSl7XG5cdFx0dmFyIGluY3JlbWVudCA9IDAsIGN1cnJlbnRWYWx1ZTtcblxuXHRcdGlmKHR5cGUgIT0gJ251bWJlcicpe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHN3aXRjaChlLmtleSl7XG5cdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0Y2FzZSAnRG93bic6XG5cdFx0XHRcdGluY3JlbWVudCA9IC0xO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRjYXNlICdVcCc6XG5cdFx0XHRcdGluY3JlbWVudCA9IDE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdGlmKGUuc2hpZnRLZXkpe1xuXHRcdFx0aW5jcmVtZW50ICo9IDEwO1xuXHRcdH1cblxuXHRcdGlmKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpe1xuXHRcdFx0aW5jcmVtZW50IC89IDEwO1xuXHRcdH1cblxuXHRcdGlmKGluY3JlbWVudCl7XG5cdFx0XHRjdXJyZW50VmFsdWUgPSBwYXJzZUZsb2F0KGRvbS52YWx1ZS5pbm5lclRleHQpO1xuXG5cdFx0XHRpZighaXNOYU4oY3VycmVudFZhbHVlKSl7XG5cdFx0XHRcdHNldFZhbHVlKE51bWJlcigoY3VycmVudFZhbHVlICsgaW5jcmVtZW50KS50b0ZpeGVkKDEwKSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cblx0ZnVuY3Rpb24gZ2V0VHlwZSh2YWx1ZSl7XG5cdFx0dmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG5cblx0XHRpZih0eXBlID09ICdvYmplY3QnKXtcblx0XHRcdGlmKHZhbHVlID09PSBudWxsKXtcblx0XHRcdFx0cmV0dXJuICdudWxsJztcblx0XHRcdH1cblxuXHRcdFx0aWYoQXJyYXkuaXNBcnJheSh2YWx1ZSkpe1xuXHRcdFx0XHRyZXR1cm4gJ2FycmF5Jztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHR5cGUgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gJ3VuZGVmaW5lZCc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHR5cGU7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uQ29sbGFwc2VFeHBhbmRDbGljaygpe1xuXHRcdGlmKGV4cGFuZGVkKXtcblx0XHRcdGNvbGxhcHNlKCk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRleHBhbmQoKTtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uSW5zZXJ0Q2xpY2soKXtcblx0XHR2YXIgbmV3TmFtZSA9IHR5cGUgPT0gJ2FycmF5JyA/IHZhbHVlLmxlbmd0aCA6IHVuZGVmaW5lZCxcblx0XHRcdGNoaWxkID0gYWRkQ2hpbGQobmV3TmFtZSwgbnVsbCwgdHJ1ZSk7XG5cdFx0aWYgKGNoaWxkLnBhcmVudCkge1xuXHRcdFx0Y2hpbGQucGFyZW50Lmluc2VydGluZyA9IHRydWU7XG5cdFx0fVxuXHRcdGlmKHR5cGUgPT0gJ2FycmF5Jyl7XG5cdFx0XHR2YWx1ZS5wdXNoKG51bGwpO1xuXHRcdFx0Y2hpbGQuZWRpdFZhbHVlKCk7XG5cdFx0XHRjaGlsZC5lbWl0KCdhcHBlbmQnLCBzZWxmLCB2YWx1ZS5sZW5ndGggLSAxLCAndmFsdWUnLCBudWxsLCB0cnVlKTtcblx0XHRcdGlmIChjaGlsZC5wYXJlbnQpIHtcblx0XHRcdFx0Y2hpbGQucGFyZW50Lmluc2VydGluZyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0Y2hpbGQuZWRpdE5hbWUoKTtcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uRGVsZXRlQ2xpY2soKXtcblx0XHRzZWxmLmVtaXQoJ2RlbGV0ZScsIHNlbGYsIHNlbGYubmFtZSwgc2VsZi52YWx1ZSwgc2VsZi5wYXJlbnQudHlwZSwgdHJ1ZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uQ2hpbGRSZW5hbWUoY2hpbGQsIGtleVBhdGgsIG9sZE5hbWUsIG5ld05hbWUsIG9yaWdpbmFsKXtcblx0XHR2YXIgYWxsb3cgPSBuZXdOYW1lICYmIHR5cGUgIT0gJ2FycmF5JyAmJiAhKG5ld05hbWUgaW4gdmFsdWUpICYmIG9yaWdpbmFsO1xuXHRcdGlmKGFsbG93KXtcblx0XHRcdHZhbHVlW25ld05hbWVdID0gY2hpbGQudmFsdWU7XG5cdFx0XHRkZWxldGUgdmFsdWVbb2xkTmFtZV07XG5cdFx0XHRpZiAoc2VsZi5pbnNlcnRpbmcpIHtcblx0XHRcdFx0Y2hpbGQuZW1pdCgnYXBwZW5kJywgY2hpbGQsIG5ld05hbWUsICduYW1lJywgbmV3TmFtZSwgdHJ1ZSk7XG5cdFx0XHRcdHNlbGYuaW5zZXJ0aW5nID0gZmFsc2U7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZSBpZihvbGROYW1lID09PSB1bmRlZmluZWQpe1xuXHRcdFx0Ly8gQSBuZXcgbm9kZSBpbnNlcnRlZCB2aWEgdGhlIFVJXG5cdFx0XHRvcmlnaW5hbCAmJiByZW1vdmVDaGlsZChjaGlsZCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKG9yaWdpbmFsKXtcblx0XHRcdC8vIENhbm5vdCByZW5hbWUgYXJyYXkga2V5cywgb3IgZHVwbGljYXRlIG9iamVjdCBrZXkgbmFtZXNcblx0XHRcdGNoaWxkLm5hbWUgPSBvbGROYW1lO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQvLyB2YWx1ZVtrZXlQYXRoXSA9IG5ld05hbWU7XG5cblx0XHQvLyBjaGlsZC5vbmNlKCdyZW5hbWUnLCBvbkNoaWxkUmVuYW1lKTtcblx0XHR2YXIgbmV3S2V5UGF0aCA9IGNoaWxkID09PSBzZWxmIHx8ICghc2VsZi53aXRoUm9vdE5hbWUgJiYgc2VsZi5pc1Jvb3QpXG5cdFx0XHQ/IGtleVBhdGhcblx0XHRcdDogbmFtZSArICcuJyArIGtleVBhdGg7XG5cdFx0aWYgKG9sZE5hbWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0c2VsZi5lbWl0KCdyZW5hbWUnLCBjaGlsZCwgc3F1YXJlYnJhY2tldGlmeShuZXdLZXlQYXRoKSwgb2xkTmFtZSwgbmV3TmFtZSxcblx0XHRcdFx0ZmFsc2UpO1xuXHRcdH1cblx0fVxuXG5cblx0ZnVuY3Rpb24gb25DaGlsZEFwcGVuZChjaGlsZCwga2V5UGF0aCwgbmFtZU9yVmFsdWUsIG5ld1ZhbHVlLCBzZW5kZXIpe1xuXHRcdHZhciBuZXdLZXlQYXRoID0gIXNlbGYud2l0aFJvb3ROYW1lICYmIHNlbGYuaXNSb290XG5cdFx0XHQ/IGtleVBhdGhcblx0XHRcdDogbmFtZSArICcuJyArIGtleVBhdGg7XG5cdFx0c2VsZi5lbWl0KCdhcHBlbmQnLCBjaGlsZCwgc3F1YXJlYnJhY2tldGlmeShuZXdLZXlQYXRoKSwgbmFtZU9yVmFsdWUsXG5cdFx0XHRuZXdWYWx1ZSwgZmFsc2UpO1xuXHRcdHNlbmRlciAmJiB1cGRhdGVPYmplY3RDaGlsZENvdW50KCk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uQ2hpbGRDaGFuZ2UoY2hpbGQsIGtleVBhdGgsIG9sZFZhbHVlLCBuZXdWYWx1ZSwgcmVjdXJzZWQpe1xuXHRcdGlmKCFyZWN1cnNlZCl7XG5cdFx0XHR2YWx1ZVtrZXlQYXRoXSA9IG5ld1ZhbHVlO1xuXHRcdH1cblxuXHRcdHZhciBuZXdLZXlQYXRoID0gIXNlbGYud2l0aFJvb3ROYW1lICYmIHNlbGYuaXNSb290XG5cdFx0XHQ/IGtleVBhdGhcblx0XHRcdDogbmFtZSArICcuJyArIGtleVBhdGg7XG5cdFx0c2VsZi5lbWl0KCdjaGFuZ2UnLCBjaGlsZCwgc3F1YXJlYnJhY2tldGlmeShuZXdLZXlQYXRoKSwgb2xkVmFsdWUsIG5ld1ZhbHVlLFxuXHRcdFx0dHJ1ZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uQ2hpbGREZWxldGUoY2hpbGQsIGtleVBhdGgsIGRlbGV0ZWRWYWx1ZSwgcGFyZW50VHlwZSwgc2VuZGVyKXtcblx0XHR2YXIga2V5ID0gY2hpbGQubmFtZTtcblxuXHRcdGlmKHR5cGUgPT0gJ2FycmF5Jyl7XG5cdFx0XHRpZiAoa2V5ID09PSBrZXlQYXRoKSB7XG5cdFx0XHRcdHZhbHVlLnNwbGljZShrZXksIDEpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIGlmIChzZW5kZXIpIHtcblx0XHRcdGRlbGV0ZSB2YWx1ZVtrZXldO1xuXHRcdH1cblxuXHRcdHZhciBuZXdLZXlQYXRoID0gIXNlbGYud2l0aFJvb3ROYW1lICYmIHNlbGYuaXNSb290XG5cdFx0XHQ/IGtleVBhdGhcblx0XHRcdDogbmFtZSArICcuJyArIGtleVBhdGg7XG5cdFx0c2VsZi5lbWl0KCdkZWxldGUnLCBjaGlsZCwgc3F1YXJlYnJhY2tldGlmeShuZXdLZXlQYXRoKSwgZGVsZXRlZFZhbHVlLFxuXHRcdFx0cGFyZW50VHlwZSwgZmFsc2UpO1xuXHRcdHNlbmRlciAmJiB1cGRhdGVPYmplY3RDaGlsZENvdW50KCk7XG5cdFx0cmVmcmVzaCh0cnVlKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gb25DaGlsZENsaWNrKGNoaWxkLCBrZXlQYXRoLCB2YWx1ZSkge1xuXHRcdHZhciBuZXdLZXlQYXRoID0gIXNlbGYud2l0aFJvb3ROYW1lICYmIHNlbGYuaXNSb290XG5cdFx0XHQ/IGtleVBhdGhcblx0XHRcdDogbmFtZSArICcuJyArIGtleVBhdGg7XG5cdFx0c2VsZi5lbWl0KCdjbGljaycsIGNoaWxkLCBzcXVhcmVicmFja2V0aWZ5KG5ld0tleVBhdGgpLCB2YWx1ZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uQ2hpbGRFeHBhbmQoY2hpbGQsIGtleVBhdGgsIHZhbHVlKSB7XG5cdFx0dmFyIG5ld0tleVBhdGggPSAhc2VsZi53aXRoUm9vdE5hbWUgJiYgc2VsZi5pc1Jvb3Rcblx0XHRcdD8ga2V5UGF0aFxuXHRcdFx0OiBuYW1lICsgJy4nICsga2V5UGF0aDtcblx0XHRzZWxmLmVtaXQoJ2V4cGFuZCcsIGNoaWxkLCBzcXVhcmVicmFja2V0aWZ5KG5ld0tleVBhdGgpLCB2YWx1ZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIG9uQ2hpbGRDb2xsYXBzZShjaGlsZCwga2V5UGF0aCwgdmFsdWUpIHtcblx0XHR2YXIgbmV3S2V5UGF0aCA9ICFzZWxmLndpdGhSb290TmFtZSAmJiBzZWxmLmlzUm9vdFxuXHRcdFx0PyBrZXlQYXRoXG5cdFx0XHQ6IG5hbWUgKyAnLicgKyBrZXlQYXRoO1xuXHRcdHNlbGYuZW1pdCgnY29sbGFwc2UnLCBjaGlsZCwgc3F1YXJlYnJhY2tldGlmeShuZXdLZXlQYXRoKSwgdmFsdWUpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBvbkNoaWxkUmVmcmVzaChjaGlsZCwga2V5UGF0aCwgdmFsdWUpIHtcblx0XHR2YXIgbmV3S2V5UGF0aCA9ICFzZWxmLndpdGhSb290TmFtZSAmJiBzZWxmLmlzUm9vdFxuXHRcdFx0PyBrZXlQYXRoXG5cdFx0XHQ6IG5hbWUgKyAnLicgKyBrZXlQYXRoO1xuXHRcdHNlbGYuZW1pdCgncmVmcmVzaCcsIGNoaWxkLCBzcXVhcmVicmFja2V0aWZ5KG5ld0tleVBhdGgpLCB2YWx1ZSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGFkZERvbUV2ZW50TGlzdGVuZXIoZWxlbWVudCwgbmFtZSwgZm4pe1xuXHRcdGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBmbik7XG5cdFx0ZG9tRXZlbnRMaXN0ZW5lcnMucHVzaCh7ZWxlbWVudCA6IGVsZW1lbnQsIG5hbWUgOiBuYW1lLCBmbiA6IGZufSk7XG5cdH1cbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgcjFjaDQgb24gMDIvMTAvMjAxNi5cbiAqL1xuXG52YXIgSlNPTlRyZWVWaWV3ID0gcmVxdWlyZSgnanNvbi10cmVlLXZpZXcnKTtcblxudmFyIHZpZXcgPSBuZXcgSlNPTlRyZWVWaWV3KCdleGFtcGxlJywge1xuICAgIGhlbGxvIDogJ3dvcmxkJyxcbiAgICBkb3VibGVDbGljayA6ICdtZSB0byBlZGl0JyxcbiAgICBhIDogbnVsbCxcbiAgICBiIDogdHJ1ZSxcbiAgICBjIDogZmFsc2UsXG4gICAgZCA6IDEsXG4gICAgZSA6IHtuZXN0ZWQgOiAnb2JqZWN0J30sXG4gICAgZiA6IFsxLDIsM11cbn0sIG51bGwpO1xuXG5cbnZpZXcuZXhwYW5kKHRydWUpO1xudmlldy53aXRoUm9vdE5hbWUgPSBmYWxzZTtcblxudmlldy5vbignY2hhbmdlJywgZnVuY3Rpb24oc2VsZiwga2V5LCBvbGRWYWx1ZSwgbmV3VmFsdWUpe1xuICAgIGNvbnNvbGUubG9nKCdjaGFuZ2UnLCBrZXksIG9sZFZhbHVlLCAnPT4nLCBuZXdWYWx1ZSwgc2VsZik7XG59KTtcbnZpZXcub24oJ3JlbmFtZScsIGZ1bmN0aW9uKHNlbGYsIGtleSwgb2xkTmFtZSwgbmV3TmFtZSkge1xuICAgIGNvbnNvbGUubG9nKCdyZW5hbWUnLCBrZXksIG9sZE5hbWUsICc9PicsIG5ld05hbWUsIHNlbGYpO1xufSk7XG52aWV3Lm9uKCdkZWxldGUnLCBmdW5jdGlvbihzZWxmLCBrZXksIHZhbHVlLCBwYXJlbnRUeXBlKSB7XG4gICAgY29uc29sZS5sb2coJ2RlbGV0ZScsIGtleSwgJz0nLCB2YWx1ZSwgcGFyZW50VHlwZSwgc2VsZik7XG59KTtcbnZpZXcub24oJ2FwcGVuZCcsIGZ1bmN0aW9uKHNlbGYsIGtleSwgbmFtZU9yVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgY29uc29sZS5sb2coJ2FwcGVuZCcsIGtleSwgbmFtZU9yVmFsdWUsICc9PicsIG5ld1ZhbHVlLCBzZWxmKTtcbn0pO1xudmlldy5vbignY2xpY2snLCBmdW5jdGlvbihzZWxmLCBrZXksIHZhbHVlKSB7XG4gICAgY29uc29sZS5sb2coJ2NsaWNrJywga2V5LCAnPScsIHZhbHVlLCBzZWxmKTtcbn0pO1xudmlldy5vbignZXhwYW5kJywgZnVuY3Rpb24oc2VsZiwga2V5LCB2YWx1ZSkge1xuICAgIGNvbnNvbGUubG9nKCdleHBhbmQnLCBrZXksICc9JywgdmFsdWUsIHNlbGYpO1xufSk7XG52aWV3Lm9uKCdjb2xsYXBzZScsIGZ1bmN0aW9uKHNlbGYsIGtleSwgdmFsdWUpIHtcbiAgICBjb25zb2xlLmxvZygnY29sbGFwc2UnLCBrZXksICc9JywgdmFsdWUsIHNlbGYpO1xufSk7XG52aWV3Lm9uKCdyZWZyZXNoJywgZnVuY3Rpb24oc2VsZiwga2V5LCB2YWx1ZSkge1xuICAgIGNvbnNvbGUubG9nKCdyZWZyZXNoJywga2V5LCAnPScsIHZhbHVlLCBzZWxmKTtcbn0pO1xuXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHZpZXcuZG9tKTtcbndpbmRvdy52aWV3ID0gdmlldztcblxudmlldy52YWx1ZS5mLnBvcCgpXG52aWV3LnZhbHVlLmYucHVzaCg5KVxudmlldy52YWx1ZS5lLmEgPSAnYWFhJztcbnZpZXcudmFsdWUuZS5kID0gJ2RkZCc7XG5kZWxldGUgdmlldy52YWx1ZS5jO1xudmlldy5yZWZyZXNoKCk7XG5cbi8qXG52aWV3LmFsd2F5c1Nob3dSb290ID0gdHJ1ZTtcbnZpZXcucmVhZG9ubHlXaGVuRmlsdGVyaW5nID0gdHJ1ZTtcbnZpZXcuZmlsdGVyVGV4dCA9ICdhJztcblxudmlldy5maWx0ZXJUZXh0ID0gbnVsbDtcblxudmlldy5yZWFkb25seSA9IHRydWU7XG4qL1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsdGVyJykuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICB2aWV3LmZpbHRlclRleHQgPSB0aGlzLnZhbHVlO1xufSk7XG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHZpZXcuYWx3YXlzU2hvd1Jvb3QgPSAhIXRoaXMuY2hlY2tlZDtcbn0pO1xuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jvd2YnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICB2aWV3LnJlYWRvbmx5V2hlbkZpbHRlcmluZyA9ICEhdGhpcy5jaGVja2VkO1xufSk7XG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm8nKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICB2aWV3LnJlYWRvbmx5ID0gISF0aGlzLmNoZWNrZWQ7XG59KTtcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICB2aWV3LnNob3dDb3VudE9mT2JqZWN0T3JBcnJheSA9ICEhdGhpcy5jaGVja2VkO1xufSk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQXQgbGVhc3QgZ2l2ZSBzb21lIGtpbmQgb2YgY29udGV4dCB0byB0aGUgdXNlclxuICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LiAoJyArIGVyICsgJyknKTtcbiAgICAgICAgZXJyLmNvbnRleHQgPSBlcjtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2UgaWYgKGxpc3RlbmVycykge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKHRoaXMuX2V2ZW50cykge1xuICAgIHZhciBldmxpc3RlbmVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oZXZsaXN0ZW5lcikpXG4gICAgICByZXR1cm4gMTtcbiAgICBlbHNlIGlmIChldmxpc3RlbmVyKVxuICAgICAgcmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RoO1xuICB9XG4gIHJldHVybiAwO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHJldHVybiBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSk7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIl19
