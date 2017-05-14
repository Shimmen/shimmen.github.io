(function () {

	var webglActive = true; // initially assume it works
	var fullscreen = false;
	var lastScrollPos = undefined;

	var canvas = document.getElementById('canvas');
	if (!canvas) {
		alert('The canvas is missing! It\'s not supposed to be missing.');
		webglActive = false;

		var btn = document.getElementById('fullscreen-btn');
		btn.parentNode.removeChild(btn);

		return;
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

		return;
	}

	if (webglActive) {

		function resizeCanvas(canvas, gl) {
			if (fullscreen) {

				if (lastScrollPos == undefined) {
					lastScrollPos = window.pageYOffset;
				}
				window.scroll(0, 0);

				canvas.classList.add('canvas-fullscreen');
				document.documentElement.classList.add('canvas-fullscreen-overflow');

				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;

			} else {

				canvas.classList.remove('canvas-fullscreen');
				document.documentElement.classList.remove('canvas-fullscreen-overflow');

				// Required for calculating canvas width
				var sections = document.getElementsByTagName('section');
				if (!sections[0]) { alert('Section missing!'); }

				var aspectRatio = 16.0 / 9.0;

				canvas.width = sections[0].clientWidth;
				canvas.height = canvas.width / aspectRatio;

				if (lastScrollPos != undefined) {
					window.scroll(0, lastScrollPos);
					lastScrollPos = undefined;
				}

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

		document.getElementById('fullscreen-btn').addEventListener('click', function() {
			fullscreen = true;
			resizeCanvas(canvas, gl2);
		}, false);

		window.addEventListener('keydown', function(e) {
			if (e.keyCode === 70 /*f*/) {
				// Is focused element is a text input or textarea, i.e. somewhere where you type? Then, don't use f for fullscreen.
				var active = document.activeElement;
				if (active && (active.tagName.toLowerCase() == 'input' && active.type == 'text' || active.tagName.toLowerCase() == 'textarea')) {
					return;
				}

				e.preventDefault();
				fullscreen = !fullscreen;
				resizeCanvas(canvas, gl2);
			}
			if (e.keyCode === 27 /*escape*/ && fullscreen) {
				e.preventDefault();
				fullscreen = false;
				resizeCanvas(canvas, gl2);
			}
		}, false);

	}

})()