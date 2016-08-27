# Flourish

Load all your site links using AJAX.

Similar to pjax, but has no dependencies and is less than 5kb minified.

Will add a history.pushState entry if supported, should work with anything >= IE8.

```javascript
var flourish = new Flourish({
	extractSelector: "#main",
	replaceSelector: "#main",
	bodyTransitionClass: "loading",
	replaceDelay: 500
});

flourish.on("post_fetch", function( options, output ) { ... });
flourish.on("post_replace", function () { ... });

window.addEventListener("popstate", ajaxLoadLink);
document.body.addEventListener("click", function(e) {
	if( target.tagName.toLowerCase() === "a" ) {
		ajaxLoadLink(e);
	}
});

function ajaxLoadLink (e) {
	...

	flourish.fetch({
		url: url,
		eventType: e.type,
		onerror: function( request, options, self ) {
			...
		}
	});
}
```
