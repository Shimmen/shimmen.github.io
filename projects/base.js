
var webglActive = true; // initially assume it works

function removeDemoElements() {
	var elemsToRemove = document.getElementsByClassName('remove-if-no-gl');

	// Remove in reverse since the HTMLCollection elemsToRemove is updated as elements are removed
	for (var i = elemsToRemove.length - 1; i >= 0; i--) {
		elemsToRemove[i].parentNode.removeChild(elemsToRemove[i]);
	}
}

var canvas = document.getElementById('canvas');
if (!canvas) {
	alert('The canvas is missing! It\'s not supposed to be missing.');
	webglActive = false;
	removeDemoElements();
}

{
	var c = document.createElement('canvas');
	var webgl2 = c.getContext('webgl2');
	if (!webgl2) {
		webglActive = false;

		var message = document.createElement('p');
		message.id = 'no-webgl2-error';
		message.innerHTML = 'WebGL 2.0 doesn\'t seem to be supported in this browser and is required for this demo! ' +
			'It should work on most modern desktop browsers though.';
		canvas.parentNode.replaceChild(message, canvas);

		removeDemoElements();
	}
}

if (webglActive) {

	function resizeCanvas(canvas) {
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

		onResize(canvas.width, canvas.height); // in the project-specifc code
	}

	window.addEventListener('resize', function() { resizeCanvas(canvas); }, false);
	window.addEventListener('orientationchange', function() { resizeCanvas(canvas); }, false);

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
		resizeCanvas(canvas);
	}

	document.addEventListener("fullscreenchange", fullscreenStateChange);
	document.addEventListener("webkitfullscreenchange", fullscreenStateChange);
	document.addEventListener("mozfullscreenchange", fullscreenStateChange);
	document.addEventListener("MSFullscreenChange", fullscreenStateChange);

	function renderLoop() {
		onRender(); // in the project-specifc code
		requestAnimationFrame(renderLoop);
	}

	// Begin render loop when DOM is loaded
	window.addEventListener('DOMContentLoaded', function () {
		onSetup(canvas); // in the project-specifc code
		resizeCanvas(canvas);
		requestAnimationFrame(renderLoop);
	}, false);
}
