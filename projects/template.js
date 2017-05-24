
var webglActive = true; // initially assume it works

var canvas = document.getElementById('canvas');
if (!canvas) {
	alert('The canvas is missing! It\'s not supposed to be missing.');
	webglActive = false;

	var btn = document.getElementById('fullscreen-btn');
	btn.parentNode.removeChild(btn);
}

var gl2 = canvas.getContext('webgl2');
if (!gl2) {
	webglActive = false;

	var message = document.createElement('p');
	message.id = 'no-webgl2-error';
	message.innerHTML = 'WebGL 2.0 doesn\'t seem to be supported in this browser and is required for this demo! ' +
		'It should work on most modern desktop browsers though.';
	canvas.parentNode.replaceChild(message, canvas);

	var btn = document.getElementById('fullscreen-btn');
	btn.parentNode.removeChild(btn);
}

if (webglActive) {

	function resizeCanvas(canvas, gl) {
		if (isFullscreen()) {

			canvas.width = screen.width;
			canvas.height = screen.height;

		} else {

			// Required for calculating canvas width
			var sections = document.getElementsByTagName('section');
			if (!sections[0]) { alert('Section missing!'); }

			var aspectRatio = 16.0 / 9.0;

			canvas.width = sections[0].clientWidth;
			canvas.height = canvas.width / aspectRatio;

		}

		if (gl) {
			gl.viewport(0, 0, canvas.width, canvas.height);
		}
	}

	function render() {
		// TODO: Do interesting stuff here!
		gl2.viewport(0, 0, canvas.width, canvas.height);
		gl2.clearColor(0.57, 0.75, 0.70, 1);
		gl2.clear(gl2.COLOR_BUFFER_BIT);

		requestAnimationFrame(render);
	}

	window.addEventListener('resize', function() { resizeCanvas(canvas, gl2); }, false);
	window.addEventListener('orientationchange', function() { resizeCanvas(canvas, gl2); }, false);
	window.addEventListener('DOMContentLoaded', function () {
		resizeCanvas(canvas, gl2);
		requestAnimationFrame(render);
	}, false);

	function isFullscreen() {
		return document.fullscreenElement || document.webkitFullscreenElement ||
			document.mozFullScreenElement || document.msFullscreenElement;
	}

	// Called from the fullscreen button onclick
	function goFullscreen() {
		if (canvas.requestFullScreen)            canvas.requestFullScreen();
		else if (canvas.webkitRequestFullScreen) canvas.webkitRequestFullScreen();
		else if (canvas.mozRequestFullScreen)    canvas.mozRequestFullScreen();
		else if (canvas.msRequestFullscreen)     canvas.msRequestFullscreen();
	}

	function fullscreenStateChange() {
		resizeCanvas(canvas, gl2);
	}

	document.addEventListener("fullscreenchange", fullscreenStateChange);
	document.addEventListener("webkitfullscreenchange", fullscreenStateChange);
	document.addEventListener("mozfullscreenchange", fullscreenStateChange);
	document.addEventListener("MSFullscreenChange", fullscreenStateChange);
}
