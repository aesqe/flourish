/*
	Flourish v0.3.2
*/

function Flourish ( options )
{
	var defaults = {
		saveHistoryEntry: true,
		replaceContents: true,
		replaceBodyClasses: true,
		replaceDelay: false,
		replaceDocumentTitle: true,
		replaceIgnoreClasses: [],
		bodyTransitionClass: "flourish-loading",
		childrenRemovingClass: "flourish-removing",
		childrenAddingClass: "flourish-adding",
		fileExt: ["jpg", "jpeg", "bmp", "gif", "png", "webp"]
	};

	this.options = this.extend(defaults, options || {});

	this.fileRx = new RegExp("\.(" + this.options.fileExt.join("|") + ")$", "i");

	if( typeof history.replaceState === "function" ) {
		history.replaceState({url: location.href}, "", location.href);
	}
}

Flourish.prototype = {

	pushStateOK: (typeof history.pushState === "function"),

	events: {
		pre_fetch: [],
		post_fetch: [],
		post_replace: []
	},

	on: function( name, callback )
	{
		if( typeof callback === "function" )
		{
			if( this.events[name] === void 0 ) {
				this.events[name] = [];
			}

			this.events[name].push(callback);
		}

		return this;
	},

	off: function( name, callback )
	{
		var e = this.events[name];
		var i;

		if( e && e.length )
		{
			if( typeof callback === "function" )
			{
				i = e.indexOf(callback);

				if( i > -1 ) {
					e.splice(i, 1);
				}
			}
			else
			{
				e.length = 0;
			}
		}

		return this;
	},

	fire: function( name )
	{
		var e = this.events[name];

		if( e && e.length )
		{
			var args = Array.prototype.slice.apply(arguments).slice(1);

			e.forEach(function(f)
			{
				if( typeof f === "function" ) {
					f.apply(f, args);
				}
			});
		}

		return this;
	},

	createDiv: function( contents )
	{
		var div = document.createElement("div");
		div.innerHTML = contents;
		return div;
	},

	getDocumentTitle: function( text )
	{
		var title = text.match(/<title>([^\<]*?)<\/title>/i);

		if( title && title[1] ) {
			return title[1].trim();
		}

		return "";
	},

	getDocumentClasses: function( text )
	{
		var htmlTag = text.match(/<html[^>]*>/i)[0];
		var bodyTag = text.match(/<body[^>]*>/i)[0];

		var htmlClasses = htmlTag.match(/class=['|"](.*?)['|"]/i);

		if( htmlClasses && htmlClasses[1] ) {
			htmlClasses = htmlClasses[1].trim();
		}

		var bodyClasses = bodyTag.match(/class=['|"](.*?)['|"]/i);

		if( bodyClasses && bodyClasses[1] ) {
			bodyClasses = bodyClasses[1].trim();
		}

		return {
			html: htmlClasses || "",
			body: bodyClasses || ""
		}
	},

	extend: function( base, extra )
	{
		for( var i in extra )
		{
			if( extra.hasOwnProperty(i) ) {
				base[i] = extra[i];
			}
		}

		return base;
	},

	fetch: function( options )
	{
		var self = this;

		options = options || {};

		if( typeof options === "string" ) {
			options = {url: options};
		}

		this.fire("pre_fetch", options);

		var onsuccess = typeof options.onsuccess === "function" ? 
							options.onsuccess : this.onsuccess.bind(this);
		var onerror = typeof options.onerror === "function" ? 
							options.onerror : this.onerror.bind(this);

		if( ! options || ! options.url || this.fileRx.test(options.url) ) {
			return false;
		}

		var request = new XMLHttpRequest();
		
		request.open("GET", options.url, true);

		request.onload = function( progress )
		{
			var cb = onerror;

			if( request.status >= 200 && request.status < 400 ) {
				cb = onsuccess;
			}

			return cb(request, options, self);
		};

		request.onerror = onerror;
		request.send();

		return this;
	},

	onsuccess: function( request, options, self )
	{
		var text = request.responseText;
		var output = {
			title: this.getDocumentTitle(text),
			documentClasses: this.getDocumentClasses(text),
			el: this.createDiv(text)
		};

		options = this.extend(this.extend({}, this.options), options);

		this.fire("post_fetch", options, output, self);

		if( options.extractSelector )
		{
			output.el = output.el.querySelector(options.extractSelector);

			if( ! output.el ) {
				this.fire("selector_not_found_error", options.extractSelector)
				return false;
			}
		}

		if( options.saveHistoryEntry && options.eventType !== "popstate" ) {
			this.addHistoryEntry({url: options.url});
		}

		if( options.replaceContents ) {
			this.replaceContents(options, output);
		}

		return output;
	},

	onerror: function( request, options, self )
	{
		console.error(request.status);
	},

	replaceContents: function( options, output, extendOptions )
	{
		if( extendOptions ) {
			options = this.extend(this.extend({}, this.options), options);
		}

		options.documentClasses = output.documentClasses;

		var container = document.querySelector(options.replaceSelector);

		if( container )
		{
			var len = 0;
			var i = 0;
			var delay = Number(options.replaceDelay);

			if( options.replaceDocumentTitle ) {
				document.querySelector("title").innerHTML = output.title;
			}

			var cb = "replaceContentsNow";

			if( delay ) {
				cb = "replaceContentsWithDelay";
			}

			this[cb](options, container, output.el.children);
		}
	},

	replaceContentsNow: function ( options, container, newNodes )
	{
		var bodyEl = document.querySelector("body");
		var ignoredClasses = options.replaceIgnoreClasses;
		var oldNodes = container.children;
		var matchedClasses = [];
		var hasClasses = [];
		var child;
		var i = 0;

		if( options.replaceBodyClasses ) {
			bodyEl.className = options.documentClasses.body;
		}

		if( options.bodyTransitionClass ) {
			bodyEl.className += " " + options.bodyTransitionClass;
		}

		if( ignoredClasses.length )
		{
			len = oldNodes.length;

			while( len > 0 )
			{
				child = oldNodes[len-1];

				if( child )
				{
					hasClasses = this.hasAnyClasses(child, ignoredClasses);

					if( hasClasses.length === 0 ) {
						container.removeChild(child);
					} else {
						matchedClasses = matchedClasses.concat(hasClasses);
					}
				}

				len--;
			}

			len = newNodes.length;
			i = 0;

			while( len > 0 )
			{
				child = newNodes[i];

				if( child )
				{
					hasClasses = this.hasAnyClasses(child, matchedClasses);

					if( hasClasses.length === 0 ) {
						container.appendChild(child);
					} else {
						child.parentNode.removeChild(child);
						i++;
					}
				}

				len--;
			}
		}
		else
		{
			while( oldNodes.length > 0 )
			{
				container.removeChild(oldNodes[i]);
			}

			while( newNodes.length > 0 )
			{
				container.appendChild(newNodes[i]);
			}
		}

		if( options.bodyTransitionClass ) {
			this.removeClass(bodyEl, options.bodyTransitionClass);
		}

		this.fire("post_replace");
	},

	replaceContentsWithDelay: function ( options, container, newNodes )
	{
		var self = this;
		var bodyEl = document.querySelector("body");
		var ignoredClasses = options.replaceIgnoreClasses;
		var removingClass = options.childrenRemovingClass;
		var addingClass = options.childrenAddingClass;
		var oldNodes = container.children;
		var len = oldNodes.length;
		var matchedClasses = [];
		var hasClasses = [];
		var child;
		var i = 0;

		if( options.bodyTransitionClass ) {
			bodyEl.className += " " + options.bodyTransitionClass;
		}

		if( removingClass )
		{
			while( len > 0 )
			{
				child = oldNodes[len-1];

				if( child )
				{
					// give the transition class only to nodes about to be removed
					if( this.hasAnyClasses(child, ignoredClasses).length === 0 ) {
						child.className += " " + removingClass;
					}
				}

				len--;
			}
		}

		setTimeout(function(newNodes)
		{
			if( options.replaceBodyClasses ) {
				bodyEl.className = options.documentClasses.body;
			}

			if( ignoredClasses.length )
			{
				len = oldNodes.length;

				while( len > 0 )
				{
					child = oldNodes[len-1];

					if( child )
					{
						hasClasses = self.hasAnyClasses(child, ignoredClasses);

						if( hasClasses.length === 0 ) {
							container.removeChild(child);
						} else {
							matchedClasses = matchedClasses.concat(hasClasses);
						}
					}

					len--;
				}

				while( newNodes.length > 0 )
				{
					child = newNodes[0];

					if( child )
					{
						hasClasses = self.hasAnyClasses(child, matchedClasses);

						if( hasClasses.length === 0 )
						{
							if( addingClass ) {
								child.className += " " + addingClass;
							}

							container.appendChild(child);
						}
						else
						{
							child.parentNode.removeChild(child);
						}
					}
				}
			}
			else
			{
				while( container.children.length > 0 )
				{
					container.removeChild(container.children[0]);
				}

				try {				
					while( newNodes.length > 0 )
					{
						if( addingClass ) {
							newNodes[0].className += " " + addingClass;
						}

						container.appendChild(newNodes[0]);
					}
				} catch(err) {
					console.log(err, newNodes);
					self.fire("replace_error", err);
				}
			}

			if( addingClass )
			{
				setTimeout(function()
				{
					c = container.children;
					len = c.length;

					for(i = 0; i < len; i++ )
					{
						self.removeClass(c[i], addingClass);
					}

					if( options.bodyTransitionClass ) {
						self.removeClass(bodyEl, options.bodyTransitionClass);
					}
				}, 25);
			}

			self.fire("post_replace");

		}, options.replaceDelay, newNodes);
	},

	unique: function (val, i, arr)
	{
		return arr.lastIndexOf(val) === i;
	},

	hasAnyClasses: function ( el, classList )
	{
		var elClasses = el.className.split(/\s+/);

		return elClasses.reduce(function(arr, c){
			if( classList.indexOf(c) > -1 ) {
				arr.push(c);
			}
			return arr;
		}, []).filter(this.unique);
	},

	removeClass: function(el, name)
	{
		if( el && el.className && typeof el.className === "string" )
		{
			el.className = el.className.split(" ").reduce(function( arr, c ) {
				c = c.trim();
				if( c.length && c !== name ) { arr.push(c); }
				return arr;
			}, []).join(" ");
		}
	},

	addHistoryEntry: function ( data )
	{
		if( this.pushStateOK ) {
			history.pushState(data, null, data.url);
		}
	}
}
