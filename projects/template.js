(function () {

	var canvas = document.getElementById('canvas');
	if (!canvas) { alert('Canvas missing!'); }

	function resizeCanvas(canvas, gl) {
		// Required for calculating canvas width
		var sections = document.getElementsByTagName('section');
		if (!sections[0]) { alert('Section missing!'); }

		var aspectRatio = 16.0 / 9.0;

		canvas.width = sections[0].clientWidth;
		canvas.height = canvas.width / aspectRatio;

		if (gl) {
			gl.viewport(0, 0, canvas.width, canvas.height);
		}
	}

	// Show a message if WebGL 2.0 is not available
	var gl2 = canvas.getContext('webgl2')
	if (!gl2) {
		var message = document.createElement('p');
		message.id = 'no-webgl2-error';
		message.innerHTML = 'WebGL 2.0 doesn\'t seem to be supported in this browser and is required for this demo! ' +
			'It should work on most modern desktop browsers though.';
		canvas.parentNode.replaceChild(message, canvas);
	}

	function render() {
		// TODO: Do interesting stuff here!
		gl2.viewport(0, 0, canvas.width, canvas.height);
		gl2.clearColor(1, 0, 1, 1);
		gl2.clear(gl2.COLOR_BUFFER_BIT);

		requestAnimationFrame(render);
	}

	window.addEventListener('resize', function() { resizeCanvas(canvas, gl2); }, false);
	window.addEventListener('orientationchange', function() { resizeCanvas(canvas, gl2); }, false);
	window.addEventListener('DOMContentLoaded', function () {
		resizeCanvas(canvas, gl2);
		requestAnimationFrame(render);
	}, false);

})()