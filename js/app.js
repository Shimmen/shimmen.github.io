(function() {

	var canvas = document.getElementById('header-canvas');
	resizeCanvas();

	// Try to grab the standard context. If it fails, fallback to experimental.
	var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
	if (!gl) alert('Unable to initialize WebGL. Your browser may not support it.');

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

	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		if (gl) {
			gl.viewport(0, 0, canvas.width, canvas.height);
			render();
		}

		// Move the first section to accomodate the header canvas (since it's positioned absolute)
		var firstSection = document.querySelector('section:nth-of-type(1)');
		firstSection.style.paddingTop = canvas.height + 'px';
	}

	// Resize the canvas to fill browser window dynamically
	window.addEventListener('resize', resizeCanvas, false);

	requestAnimationFrame(render);

})();
