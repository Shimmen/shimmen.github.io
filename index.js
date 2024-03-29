(function() {

	/*
	 * Header graphics script
	 */

	var canvas = document.getElementById('header-canvas');
	resizeCanvas();

	// Try to grab the standard context. If it fails, fallback to experimental.
	var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
	if (!gl) return; // not much more to do here then...

	// Load geometry
	var quadVertices = [
		-1, -1,
		-1, +1,
		+1, +1,

		-1, -1,
		+1, +1,
		+1, -1
	];
	var quad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quad);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);

	// Load shader stuff
	function loadShader(gl, elementId) {
		var script = document.getElementById(elementId);
		if (!script) {
			console.log('Could not locate shader with id ' + elementId);
			return null;
		}

		var shaderSource = script.innerHTML;
		var shader;

		if (script.type == 'x-shader/x-fragment') {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (script.type == 'x-shader/x-vertex') {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;  // Unknown shader type
		}

		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert('Shader compile error (' + elementId + '): ' + gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	}

	var program = gl.createProgram();
	gl.attachShader(program, loadShader(gl, 'quad.vert'));
	gl.attachShader(program, loadShader(gl, 'quad.frag'));
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		alert('Shader program link error: ' + gl.getProgramInfoLog(shader));
	}

	gl.useProgram(program);
	var vertexPosAttributeLocation = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(vertexPosAttributeLocation);
	var timeUniformLocation = gl.getUniformLocation(program, 'u_time');

	var lastTime = (new Date).getTime();
	var currentTime = lastTime;
	var accumulatedTime = 0.0;

	function render() {

		accumulatedTime += (currentTime - lastTime) / 1000.0;
		lastTime = currentTime;
		currentTime = (new Date).getTime();

		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.vertexAttribPointer(vertexPosAttributeLocation, 2, gl.FLOAT, false, 0, 0);
		gl.uniform1f(timeUniformLocation, accumulatedTime);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		requestAnimationFrame(render);
	}

	// From http://stackoverflow.com/questions/13382516/getting-scroll-bar-width-using-javascript
	function getScrollbarWidth() {
		var outer = document.createElement('div');
		outer.style.visibility = 'hidden';
		outer.style.width = '100px';
		outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps

		document.body.appendChild(outer);

		var widthNoScroll = outer.offsetWidth;
		// force scrollbars
		outer.style.overflow = 'scroll';

		// add innerdiv
		var inner = document.createElement('div');
		inner.style.width = '100%';
		outer.appendChild(inner);

		var widthWithScroll = inner.offsetWidth;

		// remove divs
		outer.parentNode.removeChild(outer);

		return widthNoScroll - widthWithScroll;
	}

	function resizeCanvas() {

		var newWidth = window.innerWidth - getScrollbarWidth();

		// Only change the canvas size if the width has changed (i.e. rotating device or changing window size). Some
		// mobile browsers change the window size when scrolling up and down, and we don't care about those events.
		if (canvas.width == newWidth) {
			return;
		}

		canvas.width = newWidth;
		canvas.height = window.innerHeight;

		if (gl) {
			gl.viewport(0, 0, canvas.width, canvas.height);
			render();
		}
	}

	// Resize the canvas to fill browser window dynamically
	window.addEventListener('resize', resizeCanvas, false);
	window.addEventListener('orientationchange', resizeCanvas, false);

	// Start animation when DOM is loaded
	window.addEventListener('DOMContentLoaded', function () {
		resizeCanvas();
		requestAnimationFrame(render);
	}, false);


})();


(function() {

	/*
	 * Smooth scrolling functionality
	 */

	function easeInOut(t) {
		t = Math.max(0, Math.min(t, 1));
		return t < 0.5
			? 4 * t*t*t
			: (t - 1) * (2*t - 2) * (2*t - 2) + 1;
	}

	// From http://stackoverflow.com/questions/17722497/scroll-smoothly-to-specific-element-on-page
	function scrollTo(elementSelector, duration) {
		if (duration === undefined) {
			duration = 850;
		}

		var startingY = window.pageYOffset;
		var targetElement = document.querySelector(elementSelector);

		var elementY = window.pageYOffset + targetElement.getBoundingClientRect().top;
		var targetY = document.body.scrollHeight - elementY < window.innerHeight
			? document.body.scrollHeight - window.innerHeight
			: elementY;
		var diff = targetY - startingY;

		var start;

		window.requestAnimationFrame(function step(timestamp) {
			if (!start) start = timestamp;
			var time = timestamp - start;
			var completion = Math.min(time / duration, 1);
			window.scrollTo(0, startingY + diff * easeInOut(completion));
			if (time < duration) {
				window.requestAnimationFrame(step)
			}
		});
	}

	document.getElementById('scroll-down-btn').addEventListener('click', function () {
		scrollTo('#about');
	});

	document.getElementById('about-link').addEventListener('click', function () {
		scrollTo('#about');
	});

	document.getElementById('resume-link').addEventListener('click', function () {
		scrollTo('#resume');
	});

	document.getElementById('projects-link').addEventListener('click', function () {
		scrollTo('#projects');
	});

	document.getElementById('stuff-link').addEventListener('click', function () {
		scrollTo('#stuff');
	});

/*
	// Since the canvas gets its size dynamically, we have to scroll down
	// to the section manually for it to work consistently.
	window.addEventListener('DOMContentLoaded', function () {
		var urlParts = window.location.href.split('/');
		if (urlParts.length > 0) {
			var requestedSection = urlParts[urlParts.length - 1];
			if (requestedSection.length > 0) {
				scrollTo(requestedSection);
			}
		}
	}, false);
*/

})();
